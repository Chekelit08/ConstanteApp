import type { FirebaseOptions } from 'firebase/app';

/**
 * Pegá acá el `firebaseConfig` de tu proyecto (Firebase → Configuración del proyecto → Tus apps → Web)
 * para activar el inicio de sesión con Google y la sincronización entre dispositivos.
 * Con `null` la app funciona igual, guardando todo en este dispositivo.
 */
export const firebaseConfig: (FirebaseOptions & { firestoreDatabaseId?: string }) | null = null;
