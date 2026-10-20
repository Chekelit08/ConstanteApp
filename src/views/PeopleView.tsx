import React, { useMemo, useRef, useState } from 'react';
import { Cake, Check, ContactRound, Gift, HandHeart, MessageCircle, Pencil, Phone, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Interaction, INTERACTION_LABEL, InteractionKind, Person, PERSON_GROUPS, PersonGroup } from '../types/life';
import { formatArgentineDate, getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { newId, nowIso, relativeDayLabel } from '../utils/lifeUtils';
import {
  avatarColor,
  contactStatus,
  greetingFor,
  initials,
  nextBirthday,
  nextBirthdays,
  parseVCards,
  peopleToCare,
  telLink,
  VCardContact,
  waLink,
  warmthColor,
} from '../utils/people';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, Card, Chip, EmptyState, Field, inputCls, Modal, PageHeader, Ring, Stat, textareaCls } from '../components/ui';
import { useToast } from '../components/Toast';

// re-export para quien ya los importaba desde acá
export { contactStatus, nextBirthdays } from '../utils/people';

const KINDS: InteractionKind[] = ['charla', 'mensaje', 'llamada', 'salida', 'actividad', 'ayuda', 'oracion'];

// ─────────────────────────────────────────────────────────────
// Avatar con anillo de "calidez" (qué tan reciente fue el último contacto)
// ─────────────────────────────────────────────────────────────
const Avatar: React.FC<{ p: Person; size?: number; warmth?: number; overdue?: boolean }> = ({ p, size = 64, warmth, overdue = false }) => {
  const inner = (
    <div
      className="rounded-full flex items-center justify-center font-display font-bold text-white select-none"
      style={{
        width: size - (warmth !== undefined ? 12 : 0),
        height: size - (warmth !== undefined ? 12 : 0),
        background: p.emoji ? 'var(--bg-elevated)' : `linear-gradient(140deg, ${avatarColor(p.id)}, color-mix(in srgb, ${avatarColor(p.id)} 55%, #1d2135))`,
        fontSize: p.emoji ? size * 0.42 : size * 0.3,
      }}
    >
      {p.emoji || initials(p.name)}
    </div>
  );
  if (warmth === undefined) return inner;
  return (
    <Ring value={Math.max(4, warmth * 100)} size={size} stroke={3.5} color={warmthColor(warmth, overdue)}>
      {inner}
    </Ring>
  );
};

/** Botones de contacto directo (WhatsApp / llamada) */
const ContactActions: React.FC<{ p: Person; birthdayToday?: boolean; compact?: boolean; onContact?: (k: InteractionKind) => void }> = ({ p, birthdayToday, compact, onContact }) => {
  const wa = waLink(p.phone, greetingFor(p, !!birthdayToday));
  const tel = telLink(p.phone);
  if (!wa && !tel) return null;
  const cls = compact ? 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center border border-app bg-surface-elevated' : `${btnSecondary} flex-1`;
  return (
    <>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className={cls} aria-label={`WhatsApp a ${p.name}`} onClick={() => onContact?.('mensaje')} style={{ color: '#25d366' }}>
          <MessageCircle className="w-4 h-4" /> {!compact && 'WhatsApp'}
        </a>
      )}
      {tel && (
        <a href={tel} className={cls} aria-label={`Llamar a ${p.name}`} onClick={() => onContact?.('llamada')}>
          <Phone className="w-4 h-4" /> {!compact && 'Llamar'}
        </a>
      )}
    </>
  );
};

export const PeopleView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const today = getTodayDateString();
  const { showToast } = useToast();
  const [edit, setEdit] = useState<Partial<Person> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [logFor, setLogFor] = useState<{ p: Person; kind?: InteractionKind } | null>(null);
  const [group, setGroup] = useState<PersonGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState<VCardContact[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const people = useMemo(() => Object.values(life.store.people), [life.store.people]);
  const interactions = useMemo(() => Object.values(life.store.interactions), [life.store.interactions]);
  const week = new Set(getWeekDays(today));
  const weekMoments = interactions.filter((i) => week.has(i.date) && i.kind !== 'oracion');
  const weekPrayers = new Set(interactions.filter((i) => week.has(i.date) && i.kind === 'oracion').map((i) => i.personId));
  const withCadence = people.filter((p) => p.contactEveryDays);
  const onTrack = withCadence.filter((p) => !contactStatus(p, interactions, today).overdue).length;
  const care = peopleToCare(people, interactions, today);
  const birthdays = nextBirthdays(people, today, 60);

  const quickLog = (p: Person, kind: InteractionKind, note?: string, date = today) => {
    life.upsert('interactions', { id: newId('int'), personId: p.id, date, kind, note, createdAt: nowIso() });
  };

  const filtered = people
    .filter((p) => group === 'all' || p.group === group)
    .filter((p) => !query.trim() || `${p.name} ${p.relation || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .map((p) => ({ p, st: contactStatus(p, interactions, today) }))
    .sort((a, b) => Number(b.st.overdue) - Number(a.st.overdue) || a.st.warmth - b.st.warmth || a.p.name.localeCompare(b.p.name));

  const open = openId ? life.store.people[openId] : null;

  const onVcf = (file: File) => {
    file.text().then((t) => {
      const list = parseVCards(t);
      if (!list.length) showToast('No encontré contactos en ese archivo', { type: 'error' });
      else setImporting(list);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Personas antes que tareas"
        title="Tu gente"
        subtitle="Amo con hechos, no solo con responsabilidad. Presente, atento, generoso y paciente."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} title="Importá contactos (.vcf) del iPhone o de Google">
              <ContactRound className="w-4 h-4" /> Importar contactos
            </button>
            <button type="button" className={btnPrimary} onClick={() => setEdit({ group: 'amigos', contactEveryDays: 14 })}>
              <Plus className="w-4 h-4" /> Persona
            </button>
            <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" className="hidden" onChange={(e) => e.target.files?.[0] && onVcf(e.target.files[0])} />
          </>
        }
      />

      {/* Hoy, cuidá a… */}
      {care.length > 0 ? (
        <section className="rounded-[30px] p-5 sm:p-6 border border-subtle bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_srgb,var(--violet)_22%,transparent),transparent_60%),var(--bg-surface)] shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="font-display text-xl font-bold text-main">Hoy, cuidá a…</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {care.map(({ p, st, reason }) => {
              const bdayToday = nextBirthday(p, today)?.inDays === 0;
              return (
                <div key={p.id} className="rounded-[22px] bg-surface-elevated/70 border border-subtle p-4 flex flex-col gap-3">
                  <button type="button" className="flex items-center gap-3 text-left cursor-pointer" onClick={() => setOpenId(p.id)}>
                    <Avatar p={p} size={52} warmth={st.warmth} overdue={st.overdue} />
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold text-main truncate">{p.name}</div>
                      <div className="text-xs text-muted leading-snug">{reason}</div>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <ContactActions p={p} birthdayToday={bdayToday} compact onContact={(k) => quickLog(p, k)} />
                    <button type="button" className={`${btnPrimary} flex-1`} onClick={() => setLogFor({ p })}>
                      <Check className="w-4 h-4" /> Hablamos
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : people.length > 0 ? (
        <div className="rounded-[26px] p-5 border border-subtle bg-surface flex items-center gap-3">
          <span className="text-2xl">🤍</span>
          <p className="text-sm text-main">Estás al día con todos. Aprovechá para orar por alguien o mandarle un mensaje sin motivo.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Momentos esta semana" value={weekMoments.length} sub={weekMoments.length ? `con ${new Set(weekMoments.map((i) => i.personId)).size} personas` : 'todavía ninguno'} tone={weekMoments.length ? 'good' : 'accent'} />
        <Stat label="Al día" value={withCadence.length ? `${onTrack}/${withCadence.length}` : '—'} sub="según cada cuánto querés verlos" tone={onTrack === withCadence.length ? 'good' : 'bad'} />
        <Stat label="Oraste por" value={weekPrayers.size} sub="personas esta semana" tone={weekPrayers.size ? 'good' : 'default'} />
        <Stat
          label="Próximo cumple"
          value={birthdays[0] ? (birthdays[0].inDays === 0 ? '¡Hoy!' : `${birthdays[0].inDays} d`) : '—'}
          sub={birthdays[0]?.p.name || 'cargá cumpleaños'}
          tone="accent"
        />
      </div>

      {/* Círculos */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <Chip active={group === 'all'} onClick={() => setGroup('all')}>
              Todos · {people.length}
            </Chip>
            {PERSON_GROUPS.map((g) => {
              const n = people.filter((p) => p.group === g.id).length;
              return (
                <Chip key={g.id} active={group === g.id} onClick={() => setGroup(group === g.id ? 'all' : g.id)}>
                  {g.emoji} {g.label} {n ? `· ${n}` : ''}
                </Chip>
              );
            })}
          </div>
          {people.length > 6 && (
            <label className="relative sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
              <input className={`${inputCls} pl-9`} placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar persona" />
            </label>
          )}
        </div>

        {group === 'elegidos' && filtered.length === 0 && (
          <div className="p-5 rounded-[26px] border border-dashed border-app text-sm text-muted">
            Plan 2026: invertirte en profundidad en <b className="text-main">2–3 chicos</b>. Agregalos para orar por cada uno, registrar el tiempo semanal y no olvidarte de sus cumpleaños.
            <div className="mt-3">
              <button type="button" className={btnPrimary} onClick={() => setEdit({ group: 'elegidos', contactEveryDays: 7 })}>
                <Plus className="w-4 h-4" /> Agregar a uno de mis chicos
              </button>
            </div>
          </div>
        )}

        {people.length === 0 ? (
          <EmptyState
            title="Empezá por tu gente cercana"
            text="Agregá a tu familia, amigos y a los chicos que acompañás. Importá tus contactos del iPhone o cargalos a mano."
            action={
              <button type="button" className={btnPrimary} onClick={() => setEdit({ group: 'familia', contactEveryDays: 7 })}>
                <Plus className="w-4 h-4" /> Agregar persona
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {filtered.map(({ p, st }) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-[22px] hover:bg-surface-elevated transition cursor-pointer text-center"
              >
                <Avatar p={p} size={68} warmth={st.warmth} overdue={st.overdue} />
                <span className="text-[13px] font-semibold text-main leading-tight line-clamp-1 w-full">{p.name}</span>
                <span className={`text-[10px] font-mono ${st.overdue ? 'text-[var(--danger)]' : 'text-dim'}`}>
                  {st.last ? relativeDayLabel(st.last) : 'sin registro'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {birthdays.length > 0 && (
        <Card title="Cumpleaños que vienen" icon={<Cake className="w-4 h-4" />}>
          <div className="divide-y divide-[var(--border-subtle)]">
            {birthdays.slice(0, 8).map(({ p, date, inDays }) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <Avatar p={p} size={36} />
                <button type="button" className="flex-1 min-w-0 text-left cursor-pointer" onClick={() => setOpenId(p.id)}>
                  <div className="text-sm font-semibold text-main truncate">{p.name}</div>
                  <div className="text-xs text-dim">{formatArgentineDate(date).replace(/ de \d{4}$/, '')}{p.gifts ? ` · 🎁 ${p.gifts}` : ''}</div>
                </button>
                <span className={`font-mono text-xs font-bold ${inDays <= 7 ? 'text-accent' : 'text-muted'}`}>{inDays === 0 ? '¡HOY!' : inDays === 1 ? 'mañana' : `en ${inDays} d`}</span>
                {inDays === 0 && <ContactActions p={p} birthdayToday compact onContact={(k) => quickLog(p, k, 'Saludo de cumple')} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {open && (
        <PersonSheet
          life={life}
          p={open}
          interactions={interactions}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            setEdit(open);
            setOpenId(null);
          }}
          onLog={(kind) => setLogFor({ p: open, kind })}
          onQuickLog={(k) => quickLog(open, k)}
        />
      )}
      {logFor && (
        <LogModal
          p={logFor.p}
          initialKind={logFor.kind}
          onClose={() => setLogFor(null)}
          onSave={(kind, note, date) => {
            quickLog(logFor.p, kind, note, date);
            showToast(`Anotado con ${logFor.p.name.split(' ')[0]} 🤍`);
            setLogFor(null);
          }}
        />
      )}
      {edit && <PersonModal life={life} initial={edit} onClose={() => setEdit(null)} />}
      {importing && <ImportModal life={life} contacts={importing} onClose={() => setImporting(null)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Ficha de una persona
// ─────────────────────────────────────────────────────────────
const PersonSheet: React.FC<{
  life: LifeApi;
  p: Person;
  interactions: Interaction[];
  onClose: () => void;
  onEdit: () => void;
  onLog: (k?: InteractionKind) => void;
  onQuickLog: (k: InteractionKind) => void;
}> = ({ life, p, interactions, onClose, onEdit, onLog, onQuickLog }) => {
  const today = getTodayDateString();
  const st = contactStatus(p, interactions, today);
  const nb = nextBirthday(p, today);
  const history = interactions.filter((i) => i.personId === p.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const groupMeta = PERSON_GROUPS.find((g) => g.id === p.group);

  return (
    <Modal open onClose={onClose} kicker={`${groupMeta?.emoji || ''} ${groupMeta?.label || ''}`} title={p.name}>
      <div className="flex items-center gap-4">
        <Avatar p={p} size={84} warmth={st.warmth} overdue={st.overdue} />
        <div className="min-w-0 space-y-1">
          {p.relation && <div className="text-sm text-main">{p.relation}</div>}
          <div className="text-xs text-muted">
            {st.last ? `Último momento: ${relativeDayLabel(st.last)}` : 'Sin momentos registrados'}
            {p.contactEveryDays ? ` · meta cada ${p.contactEveryDays} d` : ''}
          </div>
          {nb && <div className="text-xs text-muted">🎂 {formatArgentineDate(nb.date).replace(/ de \d{4}$/, '')} · {nb.inDays === 0 ? '¡hoy!' : `en ${nb.inDays} días`}</div>}
        </div>
      </div>

      <div className="flex gap-2">
        <ContactActions p={p} birthdayToday={nb?.inDays === 0} onContact={onQuickLog} />
        <button type="button" className={`${btnPrimary} flex-1`} onClick={() => onLog()}>
          <Plus className="w-4 h-4" /> Momento
        </button>
      </div>
      {!p.phone && (
        <button type="button" className="text-xs text-accent font-semibold cursor-pointer" onClick={onEdit}>
          + Agregá su teléfono para escribirle por WhatsApp con un toque
        </button>
      )}

      <button type="button" onClick={() => onQuickLog('oracion')} className="w-full flex items-center gap-2 p-3 rounded-2xl bg-surface-elevated border border-subtle text-left cursor-pointer hover:border-app">
        <HandHeart className="w-4 h-4 text-[var(--violet)] shrink-0" />
        <span className="text-sm text-main flex-1">{p.prayFor ? <>Oro por: <span className="text-muted">{p.prayFor}</span></> : 'Oré por esta persona hoy'}</span>
        <span className="text-[11px] text-dim shrink-0">tocá para anotar</span>
      </button>

      {(p.cares || p.gifts || p.notes) && (
        <div className="space-y-2 text-sm">
          {p.cares && (
            <p className="text-main">
              <span className="text-muted">💛 Le importa: </span>
              {p.cares}
            </p>
          )}
          {p.gifts && (
            <p className="text-main flex gap-1.5">
              <Gift className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              {p.gifts}
            </p>
          )}
          {p.notes && <p className="text-muted whitespace-pre-line">{p.notes}</p>}
        </div>
      )}

      <div className="pt-2 border-t border-subtle">
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-dim mb-2">Historia</div>
        {history.length === 0 && <p className="text-sm text-muted italic">Todavía nada. El primer momento cuenta.</p>}
        <ol className="space-y-2 max-h-60 overflow-y-auto">
          {history.map((h) => (
            <li key={h.id} className="flex items-start gap-3 text-sm group">
              <span className="font-mono text-[11px] text-dim w-16 shrink-0 pt-0.5">{relativeDayLabel(h.date)}</span>
              <span className="flex-1 text-main">
                {INTERACTION_LABEL[h.kind]}
                {h.note && <span className="text-muted"> · {h.note}</span>}
              </span>
              <button type="button" className="text-dim hover:text-[var(--danger)] cursor-pointer" onClick={() => life.remove('interactions', h.id)} aria-label="Borrar momento">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <button type="button" className={btnGhost} onClick={onEdit}>
        <Pencil className="w-4 h-4" /> Editar datos
      </button>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Registrar un momento
// ─────────────────────────────────────────────────────────────
const LogModal: React.FC<{ p: Person; initialKind?: InteractionKind; onClose: () => void; onSave: (k: InteractionKind, note: string | undefined, date: string) => void }> = ({
  p,
  initialKind,
  onClose,
  onSave,
}) => {
  const [kind, setKind] = useState<InteractionKind>(initialKind || 'charla');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Registrar momento"
      title={`Con ${p.name.split(' ')[0]}`}
      footer={
        <button type="button" className={btnPrimary} onClick={() => onSave(kind, note.trim() || undefined, date)}>
          <Check className="w-4 h-4" /> Guardar
        </button>
      }
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de momento">
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {INTERACTION_LABEL[k]}
          </Chip>
        ))}
      </div>
      <Field label="¿De qué hablaron? (opcional)">
        <textarea rows={2} className={textareaCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Algo para acordarte la próxima vez" />
      </Field>
      <Field label="Cuándo">
        <input type="date" className={inputCls} value={date} max={getTodayDateString()} onChange={(e) => setDate(e.target.value)} />
      </Field>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Alta / edición
// ─────────────────────────────────────────────────────────────
const CADENCES = [
  { v: 3, l: 'Cada 3 días' },
  { v: 7, l: 'Semanal' },
  { v: 14, l: 'Cada 2 semanas' },
  { v: 30, l: 'Mensual' },
  { v: 90, l: 'Cada 3 meses' },
  { v: 0, l: 'Sin meta' },
];

const PersonModal: React.FC<{ life: LifeApi; initial: Partial<Person>; onClose: () => void }> = ({ life, initial, onClose }) => {
  const [f, setF] = useState({
    name: initial.name || '',
    emoji: initial.emoji || '',
    group: (initial.group || 'amigos') as PersonGroup,
    relation: initial.relation || '',
    phone: initial.phone || '',
    birthday: initial.birthday ? `2000-${initial.birthday}` : '',
    every: initial.contactEveryDays ?? 0,
    prayFor: initial.prayFor || '',
    cares: initial.cares || '',
    gifts: initial.gifts || '',
    notes: initial.notes || '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const isEdit = Boolean(initial.id);

  const save = () => {
    if (!f.name.trim()) return;
    const now = nowIso();
    life.upsert('people', {
      id: initial.id || newId('person'),
      name: f.name.trim(),
      emoji: f.emoji.trim() || undefined,
      group: f.group,
      relation: f.relation.trim() || undefined,
      phone: f.phone.trim() || undefined,
      birthday: f.birthday ? f.birthday.slice(5) : undefined,
      contactEveryDays: f.every || undefined,
      prayFor: f.prayFor.trim() || undefined,
      cares: f.cares.trim() || undefined,
      gifts: f.gifts.trim() || undefined,
      notes: f.notes.trim() || undefined,
      createdAt: initial.createdAt || now,
      updatedAt: now,
    });
    onClose();
  };

  const remove = () => {
    if (!window.confirm(`¿Borrar a ${f.name} y toda su historia?`)) return;
    Object.values(life.store.interactions)
      .filter((i) => i.personId === initial.id)
      .forEach((h) => life.remove('interactions', h.id));
    life.remove('people', initial.id!);
    onClose();
  };

  return (
    <Modal
      open
      wide
      onClose={onClose}
      kicker={isEdit ? 'Editar persona' : 'Nueva persona'}
      title={f.name || 'Persona'}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={remove}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!f.name.trim()}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_84px] gap-2">
        <Field label="Nombre">
          <input autoFocus className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Emoji" hint="Opcional">
          <input className={`${inputCls} text-center`} value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={4} placeholder={initials(f.name || '?')} />
        </Field>
      </div>
      <Field label="Círculo" group>
        <div className="flex flex-wrap gap-1.5">
          {PERSON_GROUPS.map((g) => (
            <Chip key={g.id} active={f.group === g.id} onClick={() => set('group', g.id)}>
              {g.emoji} {g.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="¿Cada cuánto querés estar en contacto?" group>
        <div className="flex flex-wrap gap-1.5">
          {CADENCES.map((c) => (
            <Chip key={c.v} active={f.every === c.v} onClick={() => set('every', c.v)}>
              {c.l}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Celular" hint="Para WhatsApp y llamadas">
          <input className={inputCls} inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="11 1234-5678" />
        </Field>
        <Field label="Cumpleaños" hint="El año no importa">
          <input type="date" className={inputCls} value={f.birthday} onChange={(e) => set('birthday', e.target.value)} />
        </Field>
      </div>
      <Field label="Relación / contexto">
        <input className={inputCls} value={f.relation} onChange={(e) => set('relation', e.target.value)} placeholder="Ej: 14 años, juega de arquero" />
      </Field>
      <Field label="Oro por…">
        <textarea rows={2} className={textareaCls} value={f.prayFor} onChange={(e) => set('prayFor', e.target.value)} placeholder="Su familia, su fe, el colegio…" />
      </Field>
      <Field label="Le importa / para acordarme">
        <input className={inputCls} value={f.cares} onChange={(e) => set('cares', e.target.value)} placeholder="River, rinde un final en diciembre, su abuela está enferma" />
      </Field>
      <Field label="Ideas de regalo">
        <input className={inputCls} value={f.gifts} onChange={(e) => set('gifts', e.target.value)} placeholder="Libro de Lewis, camiseta" />
      </Field>
      <Field label="Notas">
        <textarea rows={2} className={textareaCls} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Importar contactos (.vcf)
// ─────────────────────────────────────────────────────────────
const ImportModal: React.FC<{ life: LifeApi; contacts: VCardContact[]; onClose: () => void }> = ({ life, contacts, onClose }) => {
  const { showToast } = useToast();
  const existing = new Set(Object.values(life.store.people).map((p) => p.name.trim().toLowerCase()));
  const [sel, setSel] = useState<Set<number>>(() => new Set(contacts.length <= 15 ? contacts.map((_, i) => i).filter((i) => !existing.has(contacts[i].name.toLowerCase())) : []));
  const [group, setGroup] = useState<PersonGroup>('amigos');
  const [q, setQ] = useState('');
  const toggle = (i: number) => {
    const n = new Set(sel);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setSel(n);
  };
  const save = () => {
    const now = nowIso();
    sel.forEach((i) => {
      const c = contacts[i];
      life.upsert('people', { id: newId('person'), name: c.name, phone: c.phone, birthday: c.birthday, group, contactEveryDays: 14, createdAt: now, updatedAt: now });
    });
    showToast(`Importaste ${sel.size} ${sel.size === 1 ? 'persona' : 'personas'}`, { type: 'success' });
    onClose();
  };
  const list = contacts.map((c, i) => ({ c, i })).filter(({ c }) => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal
      open
      onClose={onClose}
      kicker="Importar contactos"
      title={`${contacts.length} contactos`}
      footer={
        <button type="button" className={btnPrimary} disabled={!sel.size} onClick={save}>
          Agregar {sel.size || ''}
        </button>
      }
    >
      <p className="text-sm text-muted">Elegí solo a tu gente importante; NORTE no es una agenda telefónica 😉</p>
      <Field label="Agregar al círculo" group>
        <div className="flex flex-wrap gap-1.5">
          {PERSON_GROUPS.map((g) => (
            <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
              {g.emoji} {g.label}
            </Chip>
          ))}
        </div>
      </Field>
      {contacts.length > 10 && <input className={inputCls} placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contacto" />}
      <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {list.map(({ c, i }) => {
          const dup = existing.has(c.name.toLowerCase());
          return (
            <li key={i}>
              <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)} className="w-4 h-4 accent-[var(--accent)]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-main truncate">{c.name}</span>
                  <span className="block text-[11px] text-dim">
                    {[c.phone, c.birthday && `🎂 ${c.birthday.split('-').reverse().join('/')}`, dup && 'ya está en NORTE'].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};
