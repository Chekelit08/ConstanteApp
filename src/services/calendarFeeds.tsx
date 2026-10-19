import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, getTodayDateString } from '../utils/dateUtils';
import { ExternalEvent, parseIcs } from './ics';

/**
 * Calendarios externos (Google, iCloud, Outlook) suscriptos por link .ics.
 * Los links privados quedan solo en este dispositivo (no viajan en backups ni a la nube).
 */

export interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
  lastSync?: string; // ISO
  error?: string;
}

export interface FeedEvent extends ExternalEvent {
  feedId: string;
  color: string;
  feedName: string;
}

export const HOLIDAYS_URL = 'https://calendar.google.com/calendar/ical/es.ar%23holiday%40group.v.calendar.google.com/public/basic.ics';
export const FEED_COLORS = ['#4f8cff', '#5fd4a8', '#ffc861', '#b69cff', '#ff8a5b', '#ff6b7a'];

const FEEDS_KEY = 'norte_feeds';
const CACHE_KEY = 'norte_feed_cache';
const REFRESH_MS = 30 * 60_000;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin espacio o modo privado: seguimos en memoria */
  }
}

const DEFAULT_FEEDS: CalendarFeed[] = [{ id: 'feriados', name: 'Feriados de Argentina', url: HOLIDAYS_URL, color: '#5fd4a8', enabled: true }];

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch('/api/ics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!res.ok) {
    const msg = await res.json().catch(() => null);
    throw new Error(msg?.error || `Error ${res.status}`);
  }
  return res.text();
}

interface FeedsApi {
  feeds: CalendarFeed[];
  events: FeedEvent[];
  eventsOn: (date: string) => FeedEvent[];
  syncing: boolean;
  addFeed: (name: string, url: string) => Promise<void>;
  updateFeed: (id: string, patch: Partial<CalendarFeed>) => void;
  removeFeed: (id: string) => void;
  refresh: () => Promise<void>;
}

const FeedsContext = createContext<FeedsApi | null>(null);

export const CalendarFeedsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feeds, setFeeds] = useState<CalendarFeed[]>(() => load(FEEDS_KEY, DEFAULT_FEEDS));
  const [cache, setCache] = useState<Record<string, ExternalEvent[]>>(() => load(CACHE_KEY, {}));
  const [syncing, setSyncing] = useState(false);
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  useEffect(() => save(FEEDS_KEY, feeds), [feeds]);
  useEffect(() => save(CACHE_KEY, cache), [cache]);

  const syncOne = useCallback(async (feed: CalendarFeed) => {
    const today = getTodayDateString();
    try {
      const text = await fetchFeed(feed.url);
      const evs = parseIcs(text, addDays(today, -60), addDays(today, 180));
      setCache((c) => ({ ...c, [feed.id]: evs }));
      setFeeds((fs) => fs.map((f) => (f.id === feed.id ? { ...f, lastSync: new Date().toISOString(), error: undefined } : f)));
    } catch (e) {
      setFeeds((fs) => fs.map((f) => (f.id === feed.id ? { ...f, error: (e as Error).message } : f)));
      throw e;
    }
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    await Promise.allSettled(feedsRef.current.filter((f) => f.enabled).map(syncOne));
    setSyncing(false);
  }, [syncOne]);

  // al abrir la app y cada 30 min (y al volver a la app)
  useEffect(() => {
    const stale = () => feedsRef.current.some((f) => f.enabled && (!f.lastSync || Date.now() - Date.parse(f.lastSync) > REFRESH_MS));
    if (stale()) refresh();
    const id = setInterval(() => stale() && refresh(), 5 * 60_000);
    const onVis = () => document.visibilityState === 'visible' && stale() && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const addFeed = useCallback(
    async (name: string, url: string) => {
      const feed: CalendarFeed = {
        id: `f${Date.now().toString(36)}`,
        name: name.trim() || 'Google Calendar',
        url: url.trim(),
        color: FEED_COLORS[feedsRef.current.length % FEED_COLORS.length],
        enabled: true,
      };
      await syncOne(feed); // si el link no anda, se corta acá y no se guarda
      setFeeds((fs) => [...fs, { ...feed, lastSync: new Date().toISOString() }]);
    },
    [syncOne]
  );

  const updateFeed = useCallback((id: string, patch: Partial<CalendarFeed>) => {
    setFeeds((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    if (patch.enabled) {
      const f = feedsRef.current.find((x) => x.id === id);
      if (f) syncOne({ ...f, ...patch }).catch(() => undefined);
    }
  }, [syncOne]);

  const removeFeed = useCallback((id: string) => {
    setFeeds((fs) => fs.filter((f) => f.id !== id));
    setCache((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }, []);

  const events = useMemo(() => {
    const out: FeedEvent[] = [];
    feeds.forEach((f) => {
      if (!f.enabled) return;
      (cache[f.id] || []).forEach((e) => out.push({ ...e, feedId: f.id, color: f.color, feedName: f.name }));
    });
    return out;
  }, [feeds, cache]);

  const byDate = useMemo(() => {
    const m = new Map<string, FeedEvent[]>();
    events.forEach((e) => {
      if (!m.has(e.date)) m.set(e.date, []);
      m.get(e.date)!.push(e);
    });
    return m;
  }, [events]);

  const eventsOn = useCallback((date: string) => byDate.get(date) || [], [byDate]);

  const api = useMemo(
    () => ({ feeds, events, eventsOn, syncing, addFeed, updateFeed, removeFeed, refresh }),
    [feeds, events, eventsOn, syncing, addFeed, updateFeed, removeFeed, refresh]
  );
  return <FeedsContext.Provider value={api}>{children}</FeedsContext.Provider>;
};

export function useCalendarFeeds(): FeedsApi {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useCalendarFeeds fuera de CalendarFeedsProvider');
  return ctx;
}
