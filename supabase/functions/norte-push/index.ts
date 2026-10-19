// Recordatorios push de NORTE.
// Cada dispositivo se registra con un id + secreto propio y sube sus próximos avisos;
// pg_cron llama a "tick" cada minuto y se envían los que ya vencieron.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret, authorization, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

let config: Record<string, string> | null = null;
async function getConfig() {
  if (config) return config;
  const { data, error } = await db.from('push_config').select('key,value');
  if (error) throw error;
  config = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  webpush.setVapidDetails(config.vapid_subject, config.vapid_public, config.vapid_private);
  return config;
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authDevice(deviceId: unknown, secret: unknown) {
  if (typeof deviceId !== 'string' || !UUID.test(deviceId) || typeof secret !== 'string' || secret.length < 20) return null;
  const { data } = await db.from('push_devices').select('id,secret_hash,subscription').eq('id', deviceId).maybeSingle();
  if (!data || data.secret_hash !== (await sha256(secret))) return null;
  return data;
}

type Payload = { title: string; body?: string | null; url?: string | null; tag?: string | null };

/** Devuelve false si la suscripción ya no existe (hay que borrarla) */
async function send(subscription: webpush.PushSubscription, p: Payload): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(p), { TTL: 3600, urgency: 'high' });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return false;
    console.error('push error', code, (e as Error).message);
    return true;
  }
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : null);

async function tick() {
  const now = new Date();
  const stale = new Date(now.getTime() - 30 * 60_000).toISOString();
  const { data: due, error } = await db
    .from('push_reminders')
    .select('id,device_id,title,body,url,tag,push_devices(subscription)')
    .is('sent_at', null)
    .lte('fire_at', now.toISOString())
    .gte('fire_at', stale)
    .limit(200);
  if (error) throw error;
  const gone = new Set<string>();
  for (const r of due ?? []) {
    const sub = (r as unknown as { push_devices: { subscription: webpush.PushSubscription } }).push_devices?.subscription;
    if (!sub || gone.has(r.device_id)) continue;
    const ok = await send(sub, r);
    if (!ok) gone.add(r.device_id);
  }
  if (due?.length) await db.from('push_reminders').update({ sent_at: now.toISOString() }).in('id', due.map((r) => r.id));
  if (gone.size) await db.from('push_devices').delete().in('id', [...gone]);
  // limpieza de avisos viejos
  await db.from('push_reminders').delete().lt('fire_at', new Date(now.getTime() - 2 * 86400_000).toISOString());
  return { sent: due?.length ?? 0, removedDevices: gone.size };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const cfg = await getConfig();
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'tick') {
      if (req.headers.get('x-cron-secret') !== cfg.cron_secret) return json({ error: 'forbidden' }, 403);
      return json(await tick());
    }

    if (action === 'register') {
      const { deviceId, secret, subscription } = body;
      if (typeof deviceId !== 'string' || !UUID.test(deviceId) || typeof secret !== 'string' || secret.length < 20) return json({ error: 'bad device' }, 400);
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return json({ error: 'bad subscription' }, 400);
      const { data: existing } = await db.from('push_devices').select('secret_hash').eq('id', deviceId).maybeSingle();
      const hash = await sha256(secret);
      if (existing && existing.secret_hash !== hash) return json({ error: 'forbidden' }, 403);
      const sub = { endpoint: String(subscription.endpoint), keys: { p256dh: String(subscription.keys.p256dh), auth: String(subscription.keys.auth) } };
      const { error } = await db.from('push_devices').upsert({ id: deviceId, secret_hash: hash, subscription: sub, updated_at: new Date().toISOString() });
      if (error) throw error;
      return json({ ok: true });
    }

    const device = await authDevice(body?.deviceId, body?.secret);
    if (!device) return json({ error: 'forbidden' }, 403);

    if (action === 'sync') {
      const list = Array.isArray(body.reminders) ? body.reminders.slice(0, 400) : [];
      const now = Date.now();
      const rows = list
        .map((r: Record<string, unknown>) => ({
          device_id: device.id,
          fire_at: typeof r.fireAt === 'string' ? new Date(r.fireAt) : null,
          title: clip(r.title, 120),
          body: clip(r.body, 400),
          url: clip(r.url, 200),
          tag: clip(r.tag, 80),
        }))
        .filter((r: { fire_at: Date | null; title: string | null }) => r.title && r.fire_at && !isNaN(r.fire_at.getTime()) && r.fire_at.getTime() > now)
        .map((r: { fire_at: Date }) => ({ ...r, fire_at: r.fire_at.toISOString() }));
      const { error: delErr } = await db.from('push_reminders').delete().eq('device_id', device.id).is('sent_at', null);
      if (delErr) throw delErr;
      if (rows.length) {
        const { error } = await db.from('push_reminders').insert(rows);
        if (error) throw error;
      }
      return json({ ok: true, scheduled: rows.length });
    }

    if (action === 'test') {
      const ok = await send(device.subscription, { title: '🧭 NORTE', body: '¡Listo! Los recordatorios llegan a este dispositivo.', url: '/', tag: 'test' });
      if (!ok) await db.from('push_devices').delete().eq('id', device.id);
      return json({ ok });
    }

    if (action === 'unregister') {
      await db.from('push_devices').delete().eq('id', device.id);
      return json({ ok: true });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'server' }, 500);
  }
});
