import React, { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Library, Plus, Star, Trash2 } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { Book, BookStatus } from '../types/life';
import { BOOK_CATEGORIES } from '../services/lifeSeed';
import { getTodayDateString } from '../utils/dateUtils';
import { newId, nowIso, pct } from '../utils/lifeUtils';
import { btnDanger, btnGhost, btnPrimary, btnSecondary, Card, Chip, EmptyState, Field, inputCls, Modal, PageHeader, ProgressBar, Ring, Stat, textareaCls } from '../components/ui';

const STATUS_LABEL: Record<BookStatus, string> = {
  pendiente: 'Por leer',
  leyendo: 'Leyendo',
  terminado: 'Terminado',
  abandonado: 'Abandonado',
};

export const BooksView: React.FC<{ life: LifeApi }> = ({ life }) => {
  const year = getTodayDateString().slice(0, 4);
  const goal = life.store.prefs.booksPerYearGoal || 12;
  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [modal, setModal] = useState<{ open: boolean; book?: Partial<Book> }>({ open: false });

  const books = useMemo(() => Object.values(life.store.books).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [life.store.books]);
  const reading = books.filter((b) => b.status === 'leyendo');
  const finishedThisYear = books.filter((b) => b.status === 'terminado' && (b.finishDate || '').startsWith(year));
  const pagesRead = books.reduce((s, b) => s + (b.status === 'terminado' ? b.totalPages || 0 : b.currentPage || 0), 0);
  const nextUp = books.find((b) => b.status === 'pendiente');
  const monthIdx = Number(getTodayDateString().slice(5, 7));
  const expectedByNow = Math.round((goal * monthIdx) / 12);

  const updatePage = (b: Book, page: number) => {
    const now = nowIso();
    const total = b.totalPages || 0;
    const clamped = Math.max(0, total ? Math.min(total, page) : page);
    const finished = total > 0 && clamped >= total;
    life.upsert('books', {
      ...b,
      currentPage: clamped,
      status: finished ? 'terminado' : 'leyendo',
      finishDate: finished ? getTodayDateString() : b.finishDate,
      startDate: b.startDate || getTodayDateString(),
      updatedAt: now,
    });
  };

  const startReading = (b: Book) =>
    life.upsert('books', { ...b, status: 'leyendo', startDate: b.startDate || getTodayDateString(), currentPage: b.currentPage || 0, updatedAt: nowIso() });

  const shown = books.filter((b) => filter === 'all' || b.status === filter);
  const categories = Array.from(new Set([...BOOK_CATEGORIES, ...books.map((b) => b.category)]));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Compromiso: leer al menos un libro por mes"
        title="Libros"
        subtitle="Conocimiento, habilidades y carácter: activos que nadie te puede quitar."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setModal({ open: true, book: { category: '📚 Otros', status: 'pendiente' } })}>
            <Plus className="w-4 h-4" /> Libro
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-subtle flex items-center gap-3">
          <Ring value={pct(finishedThisYear.length, goal)} size={64} stroke={7}>
            <span className="text-[11px] font-mono font-bold text-main">
              {finishedThisYear.length}/{goal}
            </span>
          </Ring>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted">Leídos {year}</div>
            <div className="text-[11px] text-muted">deberías ir por {expectedByNow}</div>
          </div>
        </div>
        <Stat label="Leyendo ahora" value={reading.length} />
        <Stat label="Páginas leídas" value={pagesRead.toLocaleString('es-AR')} />
        <Stat label="Por leer" value={books.filter((b) => b.status === 'pendiente').length} />
      </div>

      {reading.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reading.map((b) => {
            const p = b.totalPages ? pct(b.currentPage || 0, b.totalPages) : 0;
            return (
              <Card key={b.id} title="Leyendo" icon={<BookOpen className="w-4 h-4" />}>
                <button type="button" onClick={() => setModal({ open: true, book: b })} className="text-left cursor-pointer">
                  <h4 className="font-display text-xl font-bold text-main">{b.title}</h4>
                  <p className="text-xs text-muted">{b.author}</p>
                </button>
                <div className="mt-3 space-y-1">
                  <ProgressBar value={p} />
                  <div className="flex justify-between text-[11px] font-mono text-muted">
                    <span>
                      pág. {b.currentPage || 0}
                      {b.totalPages ? ` de ${b.totalPages}` : ''}
                    </span>
                    <span>{b.totalPages ? `${p}%` : 'cargá el total de páginas'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[5, 10, 20].map((n) => (
                    <button key={n} type="button" className={btnSecondary} onClick={() => updatePage(b, (b.currentPage || 0) + n)}>
                      +{n} pág.
                    </button>
                  ))}
                  <input
                    className={`${inputCls} w-24`}
                    inputMode="numeric"
                    placeholder="pág."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = Number((e.target as HTMLInputElement).value);
                        if (v >= 0) updatePage(b, v);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        nextUp && (
          <Card title="Tu próximo libro" icon={<BookOpen className="w-4 h-4" />}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-xl font-bold text-main">{nextUp.title}</h4>
                <p className="text-xs text-muted">{nextUp.author}</p>
                {nextUp.summary && <p className="text-sm text-main mt-2">{nextUp.summary}</p>}
              </div>
              <button type="button" className={btnPrimary} onClick={() => startReading(nextUp)}>
                Empezar a leerlo
              </button>
            </div>
          </Card>
        )
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos ({books.length})
        </Chip>
        {(Object.keys(STATUS_LABEL) as BookStatus[]).map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]} ({books.filter((b) => b.status === s).length})
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Library className="w-12 h-12" />} title="Nada por acá" text="Probá otro filtro o agregá un libro." />
      ) : (
        categories.map((cat) => {
          const list = shown.filter((b) => b.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="space-y-2">
              <h3 className="font-display text-base font-bold text-main border-b border-app pb-2">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map((b) => (
                  <button key={b.id} type="button" onClick={() => setModal({ open: true, book: b })} className="text-left p-3 rounded-2xl bg-surface border border-subtle hover:border-accent cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${b.status === 'terminado' ? 'text-muted' : 'text-main'}`}>{b.title}</div>
                        <div className="text-[11px] text-muted">{b.author}</div>
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                          b.status === 'terminado' ? 'bg-[color-mix(in_srgb,var(--mint)_16%,transparent)] text-[var(--mint)]' : b.status === 'leyendo' ? 'bg-accent-subtle text-accent' : 'bg-surface-elevated text-muted'
                        }`}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                    </div>
                    {b.rating ? <div className="text-amber-500 text-xs mt-1">{'★'.repeat(b.rating)}</div> : null}
                    {b.summary && <p className="text-[11px] text-muted mt-1.5 line-clamp-2">{b.summary}</p>}
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}

      {modal.open && <BookModal life={life} initial={modal.book} categories={categories} onClose={() => setModal({ open: false })} />}
    </div>
  );
};

const BookModal: React.FC<{ life: LifeApi; initial?: Partial<Book>; categories: string[]; onClose: () => void }> = ({ life, initial, categories, onClose }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [author, setAuthor] = useState(initial?.author || '');
  const [category, setCategory] = useState(initial?.category || '📚 Otros');
  const [status, setStatus] = useState<BookStatus>(initial?.status || 'pendiente');
  const [totalPages, setTotalPages] = useState(initial?.totalPages ? String(initial.totalPages) : '');
  const [currentPage, setCurrentPage] = useState(initial?.currentPage ? String(initial.currentPage) : '');
  const [rating, setRating] = useState(initial?.rating || 0);
  const [summary, setSummary] = useState(initial?.summary || '');
  const [takeaways, setTakeaways] = useState(initial?.takeaways || '');
  const [notionUrl, setNotionUrl] = useState(initial?.notionUrl || '');
  const isEdit = Boolean(initial?.id);

  const save = () => {
    if (!title.trim()) return;
    const now = nowIso();
    const today = getTodayDateString();
    life.upsert('books', {
      id: initial?.id || newId('book'),
      title: title.trim(),
      author: author.trim(),
      category,
      status,
      totalPages: Number(totalPages) || undefined,
      currentPage: Number(currentPage) || undefined,
      startDate: initial?.startDate || (status !== 'pendiente' ? today : undefined),
      finishDate: status === 'terminado' ? initial?.finishDate || today : undefined,
      rating: rating || undefined,
      summary: summary.trim() || undefined,
      takeaways: takeaways.trim() || undefined,
      notionUrl: notionUrl.trim() || undefined,
      sortOrder: initial?.sortOrder ?? Object.keys(life.store.books).length + 1,
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
      kicker={isEdit ? 'Editar libro' : 'Nuevo libro'}
      title={title || 'Libro'}
      footer={
        <>
          {isEdit && (
            <button type="button" className={btnDanger} onClick={() => { life.remove('books', initial!.id!); onClose(); }}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button type="button" className={btnPrimary} onClick={save} disabled={!title.trim()}>Guardar</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Título">
          <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Autor">
          <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Páginas totales">
          <input className={inputCls} inputMode="numeric" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} />
        </Field>
        <Field label="Voy por la página">
          <input className={inputCls} inputMode="numeric" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} />
        </Field>
      </div>
      <Field label="Puntaje" group>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)} className="p-1 cursor-pointer" aria-label={`${n} estrellas`}>
              <Star className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-dim'}`} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="¿Por qué leerlo?">
        <textarea rows={2} className={textareaCls} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label="Lo que me llevo (ideas clave y hábitos para aplicar)">
        <textarea rows={4} className={textareaCls} value={takeaways} onChange={(e) => setTakeaways(e.target.value)} />
      </Field>
      <Field label="Link a mis notas (Notion)" group>
        <div className="flex gap-2">
          <input className={inputCls} value={notionUrl} onChange={(e) => setNotionUrl(e.target.value)} placeholder="https://..." />
          {notionUrl && (
            <a href={notionUrl} target="_blank" rel="noreferrer" className={btnGhost} aria-label="Abrir notas">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </Field>
    </Modal>
  );
};
