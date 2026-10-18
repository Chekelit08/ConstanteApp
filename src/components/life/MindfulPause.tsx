import React, { useState } from 'react';
import { ArrowLeft, Hand, Timer, X } from 'lucide-react';
import { LifeApi } from '../../hooks/useLifeData';
import { getVerseForDate } from '../../services/verses';
import { getTodayDateString } from '../../utils/dateUtils';
import { formatDuration, newId, nowTimeAR } from '../../utils/lifeUtils';
import { btnPrimary, btnSecondary, inputCls } from './ui';

/** Esquemas para abrir las apps desde la web (iOS / Android) */
const APP_LINKS: Record<string, { scheme: string; web: string }> = {
  instagram: { scheme: 'instagram://app', web: 'https://instagram.com' },
  tiktok: { scheme: 'snssdk1233://', web: 'https://tiktok.com' },
  youtube: { scheme: 'youtube://', web: 'https://youtube.com' },
  whatsapp: { scheme: 'whatsapp://', web: 'https://web.whatsapp.com' },
  x: { scheme: 'twitter://', web: 'https://x.com' },
  twitter: { scheme: 'twitter://', web: 'https://x.com' },
};

const INTENTIONS = ['Responder un mensaje puntual', 'Subir algo del trabajo / SMV', 'Ver algo de la iglesia o Elegidos', 'Descansar 5 minutos'];

interface Props {
  app: string;
  life: LifeApi;
  onClose: () => void;
  onGoFocus: () => void;
}

/**
 * "Pausa consciente": un freno de 10 segundos antes de entrar a una red social.
 * Muestra el versículo del día, cuánto llevás de pantalla y te pregunta para qué.
 */
export const MindfulPause: React.FC<Props> = ({ app, life, onClose, onGoFocus }) => {
  const today = getTodayDateString();
  const [intention, setIntention] = useState('');
  const [decided, setDecided] = useState<'volvi' | null>(null);
  const verse = getVerseForDate(today);
  const cfg = life.store.screenConfig;
  const appName = app.charAt(0).toUpperCase() + app.slice(1);
  const limit = cfg.appLimits[appName] || cfg.appLimits[app];
  const log = life.store.screenLogs[today];
  const yesterday = Object.values(life.store.screenLogs).sort((a, b) => b.date.localeCompare(a.date))[0];
  const pausesToday = Object.values(life.store.pauseLogs).filter((p) => p.date === today);
  const isMorning = nowTimeAR() < cfg.noSocialBefore;
  const link = APP_LINKS[app.toLowerCase()];

  const record = (decision: 'volvi' | 'abri') => {
    life.upsert('pauseLogs', { id: newId('pause'), date: today, time: nowTimeAR(), app: appName, decision, intention: intention.trim() || undefined });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Pausa consciente" className="fixed inset-0 z-[60] bg-app overflow-y-auto">
      <div className="min-h-full max-w-lg mx-auto p-6 flex flex-col justify-center gap-6 safe-top safe-bottom">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
            <Hand className="w-4 h-4" /> Pausa consciente
          </span>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-muted hover:text-main cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {decided === 'volvi' ? (
          <div className="text-center space-y-4 py-10">
            <div className="text-6xl">💪</div>
            <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-wider text-main">Bien ahí</h2>
            <p className="text-muted">Elegiste enfoque antes que dispersión. Esa decisión chiquita está formando al hombre que querés ser.</p>
            <div className="flex flex-col gap-2 pt-2">
              <button type="button" className={btnPrimary} onClick={onGoFocus}>
                <Timer className="w-4 h-4" /> Arrancar un bloque de enfoque
              </button>
              <button type="button" className={btnSecondary} onClick={onClose}>
                <ArrowLeft className="w-4 h-4" /> Ir a mi día
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-['Oswald'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-main leading-tight">
                ¿Para qué abrís {appName}?
              </h2>
              {isMorning && <p className="text-sm text-red-500 font-semibold mt-2">Tu regla: sin redes antes de las {cfg.noSocialBefore}.</p>}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-surface border border-app">
                <div className="font-['Bebas_Neue'] text-2xl text-main">{log ? formatDuration(log.totalMinutes) : yesterday ? formatDuration(yesterday.totalMinutes) : '—'}</div>
                <div className="text-[10px] font-mono uppercase text-muted">{log ? 'pantalla hoy' : 'último registro'}</div>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-app">
                <div className="font-['Bebas_Neue'] text-2xl text-main">{limit ? formatDuration(limit) : '—'}</div>
                <div className="text-[10px] font-mono uppercase text-muted">tu tope en {appName}</div>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-app">
                <div className="font-['Bebas_Neue'] text-2xl text-main">{pausesToday.length}</div>
                <div className="text-[10px] font-mono uppercase text-muted">pausas hoy</div>
              </div>
            </div>

            <blockquote className="p-5 rounded-3xl bg-surface border border-app">
              <p className="font-serif text-lg text-main leading-relaxed">“{verse.text}”</p>
              <footer className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">— {verse.ref}</footer>
            </blockquote>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {INTENTIONS.map((i) => (
                  <button key={i} type="button" onClick={() => setIntention(i)} className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${intention === i ? 'bg-accent text-accent-contrast border-accent' : 'bg-surface-elevated border-app text-muted'}`}>
                    {i}
                  </button>
                ))}
              </div>
              <input className={inputCls} value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Escribí tu intención…" />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={`${btnPrimary} min-h-[52px] text-sm`}
                onClick={() => {
                  record('volvi');
                  setDecided('volvi');
                }}
              >
                Volver a lo mío
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={!intention.trim()}
                onClick={() => {
                  record('abri');
                  if (link) {
                    window.location.href = link.scheme;
                    setTimeout(() => onClose(), 800);
                  } else {
                    onClose();
                  }
                }}
              >
                Abrir {appName} con intención
              </button>
              {!intention.trim() && <p className="text-[11px] text-dim text-center">Para abrirla, primero escribí para qué.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
