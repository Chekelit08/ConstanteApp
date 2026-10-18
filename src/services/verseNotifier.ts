import { useEffect } from 'react';
import { LifeApi } from '../hooks/useLifeData';
import { getVerseForDate, THEME_INFO, Verse } from './verses';
import { getTodayDateString } from '../utils/dateUtils';
import { nowTimeAR } from '../utils/lifeUtils';

/** Muestra el versículo como notificación (vía service worker si está disponible, así funciona en la PWA instalada) */
export async function showVerseNotification(verse: Verse): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
  const title = `📖 ${verse.ref}`;
  const options: NotificationOptions = {
    body: `${verse.text}\n\n${THEME_INFO[verse.theme].prompt}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `verso-${getTodayDateString()}`,
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
    return true;
  } catch (e) {
    console.warn('No se pudo mostrar la notificación', e);
    return false;
  }
}

/**
 * Revisa cada minuto si ya pasó la hora elegida y todavía no se envió el versículo de hoy.
 * Funciona mientras la app está abierta o en segundo plano reciente; para avisos garantizados
 * con la app cerrada se usa el calendario .ics.
 */
export function useVerseNotifier(life: LifeApi) {
  const { verseNotify, verseTime, lastVerseNotified } = life.store.prefs;
  useEffect(() => {
    if (!verseNotify) return;
    const check = async () => {
      const today = getTodayDateString();
      if (lastVerseNotified === today) return;
      if (nowTimeAR() < verseTime) return;
      const ok = await showVerseNotification(getVerseForDate(today));
      if (ok) life.patchSingleton('prefs', { lastVerseNotified: today });
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseNotify, verseTime, lastVerseNotified]);
}
