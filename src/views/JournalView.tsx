import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { DayEntry } from '../types/life';
import { addDays, formatArgentineDate, getTodayDateString } from '../utils/dateUtils';
import { dayCompletion } from '../utils/habits';
import { nowIso } from '../utils/lifeUtils';
import { btnGhost, btnPrimary, Card, Field, inputCls, PageHeader, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';

const MOODS = [
  { v: 1, e: '😞', l: 'Muy mal' },
  { v: 2, e: '😕', l: 'Mal' },
  { v: 3, e: '😐', l: 'Normal' },
  { v: 4, e: '🙂', l: 'Bien' },
  { v: 5, e: '😄', l: 'Muy bien' },
];

export const JournalView: React.FC<{ life: LifeApi; initialDate?: string }> = ({ life, initialDate }) => {
  const today = getTodayDateString();
  const [date, setDate] = useState(initialDate || today);
  const existing = life.store.days[date];
  const [mood, setMood] = useState<number | undefined>();
  const [energy, setEnergy] = useState<number | undefined>();
  const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
  const [highlight, setHighlight] = useState('');
  const [learned, setLearned] = useState('');
  const [improve, setImprove] = useState('');
  const [note, setNote] = useState('');
  const [loveCheck, setLoveCheck] = useState<DayEntry['loveCheck']>();
  const { showToast } = useToast();

  useEffect(() => {
    const e = life.store.days[date];
    setMood(e?.mood);
    setEnergy(e?.energy);
    setGratitude([...(e?.gratitude || []), '', '', ''].slice(0, 3));
    setHighlight(e?.highlight || '');
    setLearned(e?.learned || '');
    setImprove(e?.improve || '');
    setNote(e?.note || '');
    setLoveCheck(e?.loveCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const save = () => {
    life.upsert('days', {
      id: date,
      date,
      mood,
      energy,
      gratitude: gratitude.map((g) => g.trim()).filter(Boolean),
      highlight: highlight.trim() || undefined,
      learned: learned.trim() || undefined,
      improve: improve.trim() || undefined,
      note: note.trim() || undefined,
      loveCheck,
      updatedAt: nowIso(),
    });
    showToast('Día cerrado. Descansá bien 🌙', { type: 'success' });
  };

  const history = useMemo(() => Object.values(life.store.days).sort((a, b) => b.date.localeCompare(a.date)), [life.store.days]);
  const comp = dayCompletion(life.store, date);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Cierre del día" title="Diario" subtitle="Dos minutos antes de dormir: cómo estuviste, qué agradecés y qué aprendiste." />

      <div className="flex items-center justify-between">
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="font-display text-lg font-semibold text-main">{date === today ? 'Hoy' : formatArgentineDate(date, { includeDayName: true })}</span>
        <button type="button" className={btnGhost} onClick={() => setDate(addDays(date, 1))} disabled={date >= today}>
          Siguiente <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <div className="space-y-5">
            <Field label="¿Cómo estuviste hoy?" group>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => setMood(m.v)}
                    aria-pressed={mood === m.v}
                    className={`py-3 rounded-2xl border text-center cursor-pointer transition ${mood === m.v ? 'border-accent bg-accent-subtle scale-105' : 'border-app hover:border-[var(--text-dim)]'}`}
                  >
                    <div className="text-2xl">{m.e}</div>
                    <div className="text-[10px] text-muted mt-1">{m.l}</div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Energía" group>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setEnergy(n)} aria-label={`Energía ${n}`} className="flex-1 h-3 rounded-full cursor-pointer transition" style={{ background: energy && n <= energy ? 'linear-gradient(90deg,var(--gold),var(--accent))' : 'var(--bg-muted)' }} />
                ))}
              </div>
            </Field>
            <Field label="Tres cosas que agradezco" group>
              <div className="space-y-2">
                {gratitude.map((g, i) => (
                  <input key={i} className={inputCls} value={g} onChange={(e) => setGratitude(gratitude.map((x, j) => (j === i ? e.target.value : x)))} placeholder={['Algo de hoy…', 'Alguien…', 'Algo chiquito…'][i]} />
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lo mejor del día">
                <input className={inputCls} value={highlight} onChange={(e) => setHighlight(e.target.value)} />
              </Field>
              <Field label="Lo que aprendí">
                <input className={inputCls} value={learned} onChange={(e) => setLearned(e.target.value)} />
              </Field>
            </div>
            <Field label="Qué haría distinto mañana">
              <input className={inputCls} value={improve} onChange={(e) => setImprove(e.target.value)} />
            </Field>
            <Field label="¿Lo que hice hoy fue desde el amor o desde la presión?" group>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['amor', '❤️ Desde el amor'],
                  ['presion', '😮‍💨 Desde la presión'],
                ] as const).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setLoveCheck(k)} className={`py-2.5 rounded-full border text-sm font-semibold cursor-pointer ${loveCheck === k ? 'bg-[var(--text-main)] text-[var(--bg-app)] border-transparent' : 'border-app text-muted'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Lo que quieras escribir">
              <textarea rows={4} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <button type="button" className={`${btnPrimary} w-full min-h-[50px]`} onClick={save}>
              <Moon className="w-4 h-4" /> {existing ? 'Actualizar cierre' : 'Cerrar el día'}
            </button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card title="El día en números">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-num text-3xl font-bold text-main">{comp.pct}%</div>
                <div className="text-xs text-muted">hábitos ({comp.done}/{comp.total})</div>
              </div>
              <div>
                <div className="font-num text-3xl font-bold text-main">
                  {Object.values(life.store.focusSessions).filter((s) => s.date === date).reduce((s, x) => s + x.minutes, 0)}
                </div>
                <div className="text-xs text-muted">minutos de enfoque</div>
              </div>
            </div>
          </Card>
          <Card title="Días anteriores">
            {history.length === 0 ? (
              <p className="text-sm text-muted">Tus cierres aparecen acá.</p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {history.slice(0, 30).map((e) => (
                  <button key={e.id} type="button" onClick={() => setDate(e.date)} className={`w-full text-left p-3 rounded-2xl cursor-pointer border ${e.date === date ? 'border-accent bg-accent-subtle' : 'border-subtle bg-surface-elevated'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-main">{formatArgentineDate(e.date, { includeDayName: true }).replace(/ de \d{4}$/, '')}</span>
                      <span className="text-lg">{MOODS.find((m) => m.v === e.mood)?.e || '·'}</span>
                    </div>
                    {e.highlight && <p className="text-xs text-muted mt-1 truncate">✨ {e.highlight}</p>}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
