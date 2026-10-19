/**
 * Notificaciones push (llegan aunque NORTE esté cerrada).
 * Este dispositivo se registra con un id + secreto propios en el servicio de recordatorios
 * y le sube la lista de próximos avisos; el servicio los manda a la hora exacta.
 */

export const PUSH_ENDPOINT = 'https://xksdxufmgqzyntsgvntk.supabase.co/functions/v1/norte-push';
const VAPID_PUBLIC = 'BO5UQHN_1UQ1nXpEu7LIVVp7QLsKa6uyg9S-8AJxMPT3lb_WIEsSXY5knbhZ155gjk53M7MFFGsJDkaWgTZhFCI';
const DEVICE_KEY = 'norte_push_device';
const SYNC_KEY = 'norte_push_sync';

export interface PushReminder {
  fireAt: string; // ISO con zona
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

interface Device {
  id: string;
  secret: string;
}

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function getDevice(): Device | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    return raw ? (JSON.parse(raw) as Device) : null;
  } catch {
    return null;
  }
}

function randomSecret(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function call(body: Record<string, unknown>) {
  const res = await fetch(PUSH_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

export async function getPushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // en iPhone el push solo existe con NORTE instalada en la pantalla de inicio
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && getDevice() ? 'on' : 'off';
}

/** Pide permiso, se suscribe y registra el dispositivo. Tiene que llamarse desde un toque del usuario. */
export async function enablePush(): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('No diste permiso para notificaciones');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) });
  let device = getDevice();
  if (!device) {
    device = { id: crypto.randomUUID(), secret: randomSecret() };
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  }
  await call({ action: 'register', deviceId: device.id, secret: device.secret, subscription: sub.toJSON() });
  localStorage.removeItem(SYNC_KEY);
}

export async function disablePush(): Promise<void> {
  const device = getDevice();
  if (device) await call({ action: 'unregister', deviceId: device.id, secret: device.secret }).catch(() => undefined);
  const reg = await navigator.serviceWorker.getRegistration();
  await (await reg?.pushManager.getSubscription())?.unsubscribe();
  localStorage.removeItem(DEVICE_KEY);
  localStorage.removeItem(SYNC_KEY);
}

export async function sendTestPush(): Promise<void> {
  const device = getDevice();
  if (!device) throw new Error('Activá los recordatorios primero');
  const r = await call({ action: 'test', deviceId: device.id, secret: device.secret });
  if (!r.ok) throw new Error('El iPhone rechazó la suscripción. Desactivá y volvé a activar.');
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return String(h);
}

/** Sube la lista de avisos si cambió (o cada 6 h para estirar la ventana de días). Devuelve cuántos quedaron programados. */
export async function syncPushReminders(reminders: PushReminder[], force = false): Promise<number | null> {
  const device = getDevice();
  if (!device) return null;
  const h = hash(JSON.stringify(reminders));
  try {
    const last = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null') as { h: string; at: number } | null;
    if (!force && last && last.h === h && Date.now() - last.at < 6 * 3600_000) return null;
  } catch {
    /* sin cache */
  }
  const r = await call({ action: 'sync', deviceId: device.id, secret: device.secret, reminders });
  localStorage.setItem(SYNC_KEY, JSON.stringify({ h, at: Date.now() }));
  return r.scheduled ?? 0;
}

export function pushEnabledHere(): boolean {
  return getDevice() !== null;
}
