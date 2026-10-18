const PREFIX = 'norte_';

/** Lectura segura de localStorage (puede fallar en modo privado) */
export function getLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('No se pudo guardar en el dispositivo', e);
  }
}

export function removeLocalData(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignorar */
  }
}
