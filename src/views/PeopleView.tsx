import React, { useMemo, useState } from 'react';
import { Cake, HeartHandshake, Plus, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Interaction, INTERACTION_LABEL, InteractionKind, Person, PERSON_GROUPS, PersonGroup } from '../types/life';
import { formatArgentineDate, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { daysBetween, newId, nowIso, relativeDayLabel } from '../utils/lifeUtils';
import { btnDanger, btnPrimary, btnSecondary, Card, Field, inputCls, Modal, PageHeader, Stat, textareaCls } from '../components/ui';

export function lastContact(personId: string, interactions: Interaction[]): string | undefined {
  return interactions
    .filter((i) => i.personId === personId && i.kind !== 'oracion')
    .map((i) => i.date)
    .sort()
    .pop();
}

export function contactStatus(p: Person, interactions: Interaction[], today: string) {
  const last = lastContact(p.id, interactions);
  const days = last ? daysBetween(last, today) : undefined;
  const every = p.contactEveryDays;
  // Sin registros: se cuenta desde que la persona fue agregada
  const since = days ?? daysBetween(p.createdAt.slice(0, 10), today);
  const overdue = every ? since > every : false;
  const dueSoon = every && days !== undefined ? days >= every - 1 && !overdue : false;
  return { last, days, overdue, dueSoon };
}

export function nextBirthdays(people: Person[], today: string, withinDays = 45) {
  return people
    .filter((p) => p.birthday)
    .map((p) => {
      let d = `${today.slice(0, 4)}-${p.birthday}`;
      if (d < today) d = `${Number(today.slice(0, 4)) + 1}-${p.birthday}`;
      return { p, date: d, inDays: daysBetween(today, d) };
    })
    .filter((x) => x.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}

const QUICK_KINDS: InteractionKind[] = ['charla', 'salida', 'mensaje', 'llamada', 'oracion', 'ayuda', 'actividad'];

export const PeopleView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const [modal, setModal] = useState<{ open: boolean; person?: Partial<Person> }>({ open: false });
  const people = useMemo(() => Object.values(life.store.people), [life.store.people]);
  const interactions = useMemo(() => Object.values(life.store.interactions), [life.store.interactions]);
  const week = new Set(getWeekDays(today));
  const weekInteractions = interactions.filter((i) => week.has(i.date));
  const attention = people.filter((p) => contactStatus(p, interactions, today).overdue);
  const birthdays = nextBirthdays(people, today);

  const elegidos = people.filter((p) => p.group === 'elegidos');
  const elegidosTime = weekInteractions.some((i) => i.kind !== 'oracion' && elegidos.some((e) => e.id === i.personId));
  const elegidosPrayed = elegidos.filter((e) => weekInteractions.some((i) => i.personId === e.id && i.kind === 'oracion')).length;
  const mama = people.find((p) => p.id === 'person-mama');
  const papa = people.find((p) => p.id === 'person-papa');
  const mamaWeek = mama ? weekInteractions.filter((i) => i.personId === mama.id && i.kind !== 'oracion').length : 0;
  const papaStatus = papa ? contactStatus(papa, interactions, today) : undefined;

  const log = (p: Person, kind: InteractionKind, note?: string) => {
    life.upsert('interactions', { id: newId('int'), personId: p.id, date: today, kind, note, createdAt: nowIso() });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Personas antes que tareas"
        title="Personas"
        subtitle="Amo con hechos, no solo con responsabilidad. Presente, atento, generoso y paciente."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setModal({ open: true, person: { group: 'elegidos' } })}>
            <Plus className="w-4 h-4" /> Persona
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Momentos con mamá" value={mamaWeek} sub="esta semana · meta semanal" tone={mamaWeek > 0 ? 'good' : 'accent'} />
        <Stat
          label="Último encuentro con papá"
          value={papaStatus?.days !== undefined ? `${papaStatus.days} d` : '—'}
          sub="meta: cada 7–15 días"
          tone={papaStatus?.days !== undefined && papaStatus.days <= 15 ? 'good' : 'bad'}
        />
        <Stat label="Elegidos" value={elegidos.length ? `${elegidosPrayed}/${elegidos.length} 🙏` : '—'} sub={elegidosTime ? 'tiempo con ellos ✓' : 'sin tiempo esta semana'} tone={elegidosTime ? 'good' : 'accent'} />
        <Stat label="Necesitan tu atención" value={attention.length} tone={attention.length ? 'bad' : 'good'} />
      </div>

      {(attention.length > 0 || birthdays.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attention.length > 0 && (
            <Card title="Hace mucho que no…" icon={<HeartHandshake className="w-4 h-4" />}>
              <div className="space-y-2">
                {attention.slice(0, 6).map((p) => {
                  const st = contactStatus(p, interactions, today);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xl">{p.emoji || '🙂'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-main">{p.name}</div>
                        <div className="text-[11px] text-muted">{st.days === undefined ? 'Sin registros' : `Hace ${st.days} días`} · cada {p.contactEveryDays} días</div>
                      </div>
                      <button type="button" className={btnSecondary} onClick={() => log(p, 'mensaje')}>
                        📱 Le escribí
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {birthdays.length > 0 && (
            <Card title="Próximos cumpleaños" icon={<Cake className="w-4 h-4" />}>
              <div className="space-y-2">
                {birthdays.map(({ p, date, inDays }) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-main">
                      🎂 {p.name} · {formatArgentineDate(date).replace(/ de \d{4}$/, '')}
                    </span>
                    <span className="font-mono text-xs text-accent font-bold">{inDays === 0 ? '¡HOY!' : `en ${inDays} días`}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {PERSON_GROUPS.map((g) => {
        const list = people.filter((p) => p.group === g.id);
        if (!list.length && g.id !== 'elegidos') return null;
        return (
          <section key={g.id} className="space-y-3">
            <h3 className="font-display text-lg font-bold text-main border-b border-app pb-2">
              {g.emoji} {g.label}
            </h3>
            {g.id === 'elegidos' && list.length === 0 && (
              <div className="p-4 rounded-2xl border border-dashed border-app text-sm text-muted">
                Plan 2026: invertirte en profundidad en <b className="text-main">2–3 chicos</b>. Agregalos acá para orar por cada uno, registrar el tiempo semanal y acordarte de sus cumpleaños.
                <div className="mt-3">
                  <button type="button" className={btnPrimary} onClick={() => setModal({ open: true, person: { group: 'elegidos', contactEveryDays: 7 } })}>
                    <Plus className="w-4 h-4" /> Agregar a uno de mis chicos
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map((p) => {
                const st = contactStatus(p, interactions, today);
                const recent = interactions.filter((i) => i.personId === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
                return (
                  <Card key={p.id}>
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setModal({ open: true, person: p })} className="text-3xl cursor-pointer" aria-label={`Editar ${p.name}`}>
                        {p.emoji || '🙂'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button type="button" onClick={() => setModal({ open: true, person: p })} className="text-left cursor-pointer">
                          <div className="font-display text-lg font-bold text-main">{p.name}</div>
                          {p.relation && <div className="text-[11px] text-muted">{p.relation}</div>}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${st.overdue ? 'bg-[var(--danger)]' : st.dueSoon ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className="text-[11px] font-mono text-muted">
                            {st.last ? `Último contacto: ${relativeDayLabel(st.last)}` : 'Sin contacto registrado'}
                            {p.contactEveryDays ? ` · cada ${p.contactEveryDays} d` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    {p.prayFor && <p className="text-xs text-main mt-3 p-2 rounded-lg bg-surface-elevated">🙏 {p.prayFor}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {QUICK_KINDS.map((k) => (
                        <button key={k} type="button" onClick={() => log(p, k)} className="text-[11px] px-2 py-1 rounded-lg bg-surface-elevated border border-app hover:border-accent cursor-pointer" title={INTERACTION_LABEL[k]}>
                          {INTERACTION_LABEL[k]}
                        </button>
                      ))}
                    </div>
                    {recent.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {recent.map((i) => (
                          <div key={i.id} className="flex items-center gap-2 text-[11px] text-muted">
                            <span className="font-mono w-14 shrink-0">{relativeDayLabel(i.date)}</span>
                            <span className="truncate flex-1">
                              {INTERACTION_LABEL[i.kind]} {i.note ? `· ${i.note}` : ''}
                            </span>
                            <button type="button" className="text-dim hover:text-[var(--danger)]" onClick={() => life.remove('interactions', i.id)} aria-label="Borrar registro">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {modal.open && <PersonModal life={life} initial={modal.person} onClose={() => setModal({ open: false })} />}
    </div>
  );
};

const PersonModal: React.FC<{ life: LifeApi; initial?: Partial<Person>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '🙂');
  const [group, setGroup] = useState<PersonGroup>(initial?.group || 'amigos');
  const [relation, setRelation] = useState(initial?.relation || '');
  const [birthday, setBirthday] = useState(initial?.birthday ? `2000-${initial.birthday}` : '');
  const [every, setEvery] = useState(initial?.contactEveryDays ? String(initial.contactEveryDays) : '');
  const [prayFor, setPrayFor] = useState(initial?.prayFor || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [logKind, setLogKind] = useState<InteractionKind>('charla');
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(getTodayDateString());
  const isEdit = Boolean(initial?.id);
  const history = isEdit ? Object.values(life.store.interactions).filter((i) => i.personId === initial!.id).sort((a, b) => b.date.localeCompare(a.date)) : [];

  const save = () => {
    if (!name.trim()) return;
    const now = nowIso();
    life.upsert('people', {
      id: initial?.id || newId('person'),
      name: name.trim(),
      emoji,
      group,
      relation: relation.trim() || undefined,
      birthday: birthday ? birthday.slice(5) : undefined,
      contactEveryDays: Number(every) || undefined,
      prayFor: prayFor.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker={isEdit ? 'Editar persona' : 'Nueva persona'}
      title={name || 'Persona'}
      footer={
        <>
          {isEdit && (
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                history.forEach((h) => life.remove('interactions', h.id));
                life.remove('people', initial!.id!);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!name.trim()}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <Field label="Emoji">
          <input className={`${inputCls} text-center`} value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Nombre">
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Grupo">
          <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as PersonGroup)}>
            {PERSON_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Relación / contexto">
          <input className={inputCls} value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Ej: 14 años, juega de arquero" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cumpleaños" hint="El año no importa">
          <input type="date" className={inputCls} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </Field>
        <Field label="Contactar cada (días)">
          <input className={inputCls} inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} placeholder="Ej: 7" />
        </Field>
      </div>
      <Field label="Oro por…">
        <textarea rows={2} className={textareaCls} value={prayFor} onChange={(e) => setPrayFor(e.target.value)} placeholder="Su familia, su fe, el colegio…" />
      </Field>
      <Field label="Notas (contexto, familia, lo que le importa)">
        <textarea rows={3} className={textareaCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {isEdit && (
        <div className="space-y-2 pt-3 border-t border-app">
          <span className="text-[11px] font-semibold text-muted">Registrar momento</span>
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[180px_140px_1fr_auto] gap-2">
            <select className={inputCls} value={logKind} onChange={(e) => setLogKind(e.target.value as InteractionKind)}>
              {Object.entries(INTERACTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input type="date" className={`${inputCls} hidden sm:block`} value={logDate} max={getTodayDateString()} onChange={(e) => setLogDate(e.target.value)} />
            <input className={`${inputCls} col-span-2 sm:col-span-1 order-3 sm:order-none`} value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="¿De qué hablaron?" />
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                life.upsert('interactions', { id: newId('int'), personId: initial!.id!, date: logDate, kind: logKind, note: logNote.trim() || undefined, createdAt: nowIso() });
                setLogNote('');
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((h) => (
              <div key={h.id} className="flex gap-2 text-xs text-muted">
                <span className="font-mono w-20 shrink-0">{formatArgentineDate(h.date).replace(/ de \d{4}$/, '')}</span>
                <span className="text-main">
                  {INTERACTION_LABEL[h.kind]} {h.note ? `· ${h.note}` : ''}
                </span>
              </div>
            ))}
            {history.length === 0 && <p className="text-xs text-muted italic">Sin registros todavía.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
};

