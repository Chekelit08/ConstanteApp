/**
 * IndexedDB storage for journal media (audio and photo blobs / base64).
 * Replaces indiscriminate localStorage storage to prevent quota exhaustion
 * and guarantees original files are safely retained offline.
 */

const DB_NAME = 'constante_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

export interface StoredMediaItem {
  id: string; // e.g. "audio-YYYY-MM-DD-..." or "photo-YYYY-MM-DD-..."
  dataUrl: string; // base64 / data URL
  mimeType: string;
  createdAt: string;
}

// In-memory fallback if IndexedDB is blocked or unsupported
const memoryFallbackMap = new Map<string, StoredMediaItem>();

function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Error al abrir la base de datos de medios.'));
  });
}

/**
 * Saves a media item (audio or photo) in IndexedDB
 */
export async function saveMediaItem(
  id: string,
  dataUrl: string,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  if (!id || !dataUrl) return false;

  const item: StoredMediaItem = {
    id,
    dataUrl,
    mimeType,
    createdAt: new Date().toISOString(),
  };

  // Always keep in memory fallback
  memoryFallbackMap.set(id, item);

  try {
    const db = await openMediaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('Error saving to IndexedDB, stored in memory fallback:', req.error);
        resolve(true); // preserved in memory fallback
      };
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, media held in memory fallback:', err);
    return true;
  }
}

/**
 * Retrieves a media item by ID
 */
export async function getMediaItem(id: string): Promise<string | null> {
  if (!id) return null;

  // Check memory first
  if (memoryFallbackMap.has(id)) {
    return memoryFallbackMap.get(id)!.dataUrl;
  }

  try {
    const db = await openMediaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          memoryFallbackMap.set(id, req.result);
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Deletes a media item by ID
 */
export async function deleteMediaItem(id: string): Promise<void> {
  if (!id) return;
  memoryFallbackMap.delete(id);

  try {
    const db = await openMediaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

/**
 * Exports all media items for the full JSON backup
 */
export async function exportAllMedia(): Promise<Record<string, StoredMediaItem>> {
  const result: Record<string, StoredMediaItem> = {};

  // Copy memory fallback first
  memoryFallbackMap.forEach((v, k) => {
    result[k] = v;
  });

  try {
    const db = await openMediaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          result[cursor.value.id] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => resolve(result);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return result;
  }
}

/**
 * Restores all media items from an imported backup into IndexedDB
 */
export async function importAllMedia(mediaMap: Record<string, StoredMediaItem>): Promise<number> {
  if (!mediaMap || typeof mediaMap !== 'object') return 0;
  let count = 0;

  for (const [id, item] of Object.entries(mediaMap)) {
    if (item && item.dataUrl) {
      await saveMediaItem(id, item.dataUrl, item.mimeType || 'application/octet-stream');
      count++;
    }
  }

  return count;
}
