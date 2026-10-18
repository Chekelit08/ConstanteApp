import { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getLocalData, setLocalData } from '../services/dataStorage';
import { createEmptyLifeStore, createSeededLifeStore } from '../services/lifeSeed';
import {
  COLLECTION_KEYS,
  CollectionItem,
  CollectionKey,
  LifeStore,
  SINGLETON_KEYS,
  SingletonKey,
} from '../types/life';

/**
 * Store del Sistema de Vida.
 * - Local-first: todo vive en localStorage por usuario.
 * - Con sesión de Google se sincroniza a Firestore en users/{uid}/life/{kind__id},
 *   un documento por ítem (así no hay límite de tamaño y los borrados se propagan).
 */

const storageKey = (userId: string) => `life_${userId}`;
const SINGLE_PREFIX = 'single';

function docIdFor(kind: string, id: string): string {
  return `${kind}__${id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

/** Firestore rechaza `undefined`: se limpia con un roundtrip JSON */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function loadStore(userId: string): LifeStore {
  const saved = getLocalData<Partial<LifeStore> | null>(storageKey(userId), null);
  if (!saved) return createSeededLifeStore();
  const empty = createEmptyLifeStore();
  const merged: LifeStore = { ...empty, ...saved } as LifeStore;
  // Mezcla superficial de singletons para que aparezcan campos nuevos
  merged.financeConfig = { ...empty.financeConfig, ...(saved.financeConfig || {}) };
  merged.screenConfig = { ...empty.screenConfig, ...(saved.screenConfig || {}) };
  merged.purpose = { ...empty.purpose, ...(saved.purpose || {}) };
  merged.prefs = { ...empty.prefs, ...(saved.prefs || {}) };
  COLLECTION_KEYS.forEach((k) => {
    if (!merged[k] || typeof merged[k] !== 'object') (merged as any)[k] = {};
  });
  return merged;
}

export type LifeApi = ReturnType<typeof useLifeData>;

export function useLifeData(user: User | null) {
  const userId = user ? user.uid : 'local';
  const [store, setStore] = useState<LifeStore>(() => loadStore(userId));
  const storeRef = useRef(store);
  storeRef.current = store;
  const loadedForRef = useRef(userId);

  // Cambio de cuenta → cargar el espacio de ese usuario
  useEffect(() => {
    if (loadedForRef.current !== userId) {
      loadedForRef.current = userId;
      setStore(loadStore(userId));
    }
  }, [userId]);

  // Persistencia local
  useEffect(() => {
    if (loadedForRef.current === userId) {
      setLocalData(storageKey(userId), store);
    }
  }, [store, userId]);

  const remoteEnabled = Boolean(user && user.uid !== 'local');

  const pushDoc = useCallback(
    async (kind: string, id: string, payload: unknown) => {
      if (!user || user.uid === 'local') return;
      const docId = docIdFor(kind, id);
      try {
        await setDoc(doc(db, 'users', user.uid, 'life', docId), {
          id: docId,
          userId: user.uid,
          kind,
          itemId: id,
          payload: clean(payload),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Life sync write failed', docId, err);
      }
    },
    [user]
  );

  const deleteRemote = useCallback(
    async (kind: string, id: string) => {
      if (!user || user.uid === 'local') return;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'life', docIdFor(kind, id)));
      } catch (err) {
        console.warn('Life sync delete failed', err);
      }
    },
    [user]
  );

  // Listener remoto
  useEffect(() => {
    if (!remoteEnabled || !user) return;
    let first = true;
    const col = collection(db, 'users', user.uid, 'life');
    const unsub = onSnapshot(
      col,
      (snapshot) => {
        const remoteIds = new Set<string>();
        setStore((prev) => {
          const next: LifeStore = { ...prev };
          const touched = new Set<string>();
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as { kind: string; itemId: string; payload: any };
            if (!data || !data.kind) return;
            const isSingle = data.kind.startsWith(`${SINGLE_PREFIX}:`);
            const key = isSingle ? data.kind.slice(SINGLE_PREFIX.length + 1) : data.kind;
            if (isSingle) {
              if (change.type !== 'removed' && SINGLETON_KEYS.includes(key as SingletonKey)) {
                (next as any)[key] = data.payload;
              }
              return;
            }
            if (!COLLECTION_KEYS.includes(key as CollectionKey)) return;
            if (!touched.has(key)) {
              (next as any)[key] = { ...(next as any)[key] };
              touched.add(key);
            }
            if (change.type === 'removed') {
              delete (next as any)[key][data.itemId];
            } else {
              (next as any)[key][data.itemId] = data.payload;
            }
          });
          return next;
        });

        if (first) {
          first = false;
          snapshot.docs.forEach((d) => remoteIds.add(d.id));
          // Subir lo que existe localmente y todavía no está en la nube
          const current = storeRef.current;
          COLLECTION_KEYS.forEach((k) => {
            Object.entries(current[k] || {}).forEach(([id, item]) => {
              if (!remoteIds.has(docIdFor(k, id))) pushDoc(k, id, item);
            });
          });
          SINGLETON_KEYS.forEach((k) => {
            if (!remoteIds.has(docIdFor(`${SINGLE_PREFIX}:${k}`, 'value'))) {
              pushDoc(`${SINGLE_PREFIX}:${k}`, 'value', current[k]);
            }
          });
        }
      },
      (err) => console.warn('Life snapshot error', err)
    );
    return () => unsub();
  }, [remoteEnabled, user, pushDoc]);

  // ── API ──────────────────────────────────────────────────
  const upsert = useCallback(
    <K extends CollectionKey>(kind: K, item: CollectionItem<K>) => {
      const id = (item as any).id as string;
      setStore((prev) => ({
        ...prev,
        [kind]: { ...prev[kind], [id]: item },
      }));
      pushDoc(kind, id, item);
    },
    [pushDoc]
  );

  const upsertMany = useCallback(
    <K extends CollectionKey>(kind: K, items: CollectionItem<K>[]) => {
      setStore((prev) => {
        const col = { ...prev[kind] } as any;
        items.forEach((it: any) => (col[it.id] = it));
        return { ...prev, [kind]: col };
      });
      items.forEach((it: any) => pushDoc(kind, it.id, it));
    },
    [pushDoc]
  );

  const remove = useCallback(
    (kind: CollectionKey, id: string) => {
      setStore((prev) => {
        const col = { ...prev[kind] } as any;
        delete col[id];
        return { ...prev, [kind]: col };
      });
      deleteRemote(kind, id);
    },
    [deleteRemote]
  );

  const setSingleton = useCallback(
    <K extends SingletonKey>(kind: K, value: LifeStore[K]) => {
      setStore((prev) => ({ ...prev, [kind]: value }));
      pushDoc(`${SINGLE_PREFIX}:${kind}`, 'value', value);
    },
    [pushDoc]
  );

  const patchSingleton = useCallback(
    <K extends SingletonKey>(kind: K, partial: Partial<LifeStore[K]>) => {
      const merged = Array.isArray(storeRef.current[kind])
        ? (partial as LifeStore[K])
        : ({ ...(storeRef.current[kind] as any), ...partial } as LifeStore[K]);
      setSingleton(kind, merged);
    },
    [setSingleton]
  );

  /** Reemplaza o fusiona un store completo (restaurar backup) */
  const restore = useCallback(
    (incoming: Partial<LifeStore> | undefined, mode: 'merge' | 'replace') => {
      if (!incoming || typeof incoming !== 'object') return;
      const base = mode === 'replace' ? createEmptyLifeStore() : storeRef.current;
      const next: LifeStore = { ...base };
      COLLECTION_KEYS.forEach((k) => {
        const inc = (incoming as any)[k];
        if (inc && typeof inc === 'object') {
          (next as any)[k] = mode === 'replace' ? { ...inc } : { ...(base as any)[k], ...inc };
        }
      });
      SINGLETON_KEYS.forEach((k) => {
        if ((incoming as any)[k]) (next as any)[k] = (incoming as any)[k];
      });
      setStore(next);
      COLLECTION_KEYS.forEach((k) =>
        Object.entries(next[k]).forEach(([id, item]) => pushDoc(k, id, item))
      );
      SINGLETON_KEYS.forEach((k) => pushDoc(`${SINGLE_PREFIX}:${k}`, 'value', next[k]));
    },
    [pushDoc]
  );

  const reset = useCallback(() => {
    const current = storeRef.current;
    COLLECTION_KEYS.forEach((k) => Object.keys(current[k]).forEach((id) => deleteRemote(k, id)));
    const fresh = createSeededLifeStore();
    setStore(fresh);
    COLLECTION_KEYS.forEach((k) => Object.entries(fresh[k]).forEach(([id, item]) => pushDoc(k, id, item)));
    SINGLETON_KEYS.forEach((k) => pushDoc(`${SINGLE_PREFIX}:${k}`, 'value', fresh[k]));
  }, [deleteRemote, pushDoc]);

  return {
    store,
    userId,
    upsert,
    upsertMany,
    remove,
    setSingleton,
    patchSingleton,
    restore,
    reset,
  };
}
