/**
 * Bóveda: tus datos personales viajan cifrados (AES-GCM + PBKDF2) dentro de la app.
 * El sitio puede ser público: sin la clave, nadie puede leerlos.
 */
import type { PersonalSeed } from './lifeSeed';

interface VaultFile {
  v: 1;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

const files = import.meta.glob<{ default: VaultFile }>('./vault.json', { eager: true });
export const VAULT: VaultFile | null = Object.values(files)[0]?.default || null;

const DONE_KEY = 'norte_vault_done';

export function vaultPending(): boolean {
  if (!VAULT) return false;
  try {
    return localStorage.getItem(DONE_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markVaultDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignorar */
  }
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function openVault(passphrase: string): Promise<PersonalSeed> {
  if (!VAULT) throw new Error('Sin bóveda');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase.trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64(VAULT.salt), iterations: VAULT.iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(VAULT.iv) }, key, b64(VAULT.data));
  return JSON.parse(new TextDecoder().decode(plain)) as PersonalSeed;
}
