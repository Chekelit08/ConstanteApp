// Trae un calendario .ics (Google, iCloud, Outlook) para la app.
// El navegador no puede pedirlo directo por CORS. Solo se permiten hosts de calendarios conocidos.

const ALLOWED = [/^calendar\.google\.com$/, /^p\d+-caldav\.icloud\.com$/, /^(outlook\.live|outlook\.office365|outlook\.office)\.com$/];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  let url: URL;
  try {
    const body = (await request.json()) as { url?: string };
    url = new URL(String(body.url || '').trim().replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return Response.json({ error: 'Link inválido' }, { status: 400 });
  }
  if (url.protocol !== 'https:' || !ALLOWED.some((re) => re.test(url.hostname))) {
    return Response.json({ error: 'Solo se aceptan links de Google Calendar, iCloud u Outlook' }, { status: 400 });
  }
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { Accept: 'text/calendar' } });
    if (!res.ok) return Response.json({ error: `El calendario respondió ${res.status}` }, { status: 502 });
    const text = await res.text();
    if (text.length > MAX_BYTES) return Response.json({ error: 'El calendario es demasiado grande' }, { status: 413 });
    if (!text.includes('BEGIN:VCALENDAR')) return Response.json({ error: 'Ese link no es un calendario .ics' }, { status: 422 });
    return new Response(text, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'No se pudo leer el calendario' }, { status: 504 });
  }
}
