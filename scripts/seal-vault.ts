/**
 * Cifra src/services/personalSeed.ts en src/services/vault.json.
 * Uso: NORTE_KEY="tu-clave" npx tsx scripts/seal-vault.ts
 */
import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { PERSONAL_SEED } from '../src/services/personalSeed';

const pass = process.env.NORTE_KEY;
if (!pass) throw new Error('Falta NORTE_KEY');

const iterations = 310000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const enc = new TextEncoder();
const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(PERSONAL_SEED))));
const b64 = (u: Uint8Array) => Buffer.from(u).toString('base64');
writeFileSync('src/services/vault.json', JSON.stringify({ v: 1, iterations, salt: b64(salt), iv: b64(iv), data: b64(data) }));
console.log('vault.json listo', data.length, 'bytes');
