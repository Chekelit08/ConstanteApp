import React, { useRef, useState } from 'react';
import { Cloud, Download, LogIn, LogOut, Moon, Sun, SunMoon, Upload } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { LifePrefs } from '../types/life';
import { getTodayDateString } from '../utils/dateUtils';
import { downloadTextFile } from '../utils/lifeUtils';
import { btnDanger, btnPrimary, btnSecondary, Card, Field, inputCls, PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';
import { CalendarsCard, RemindersCard } from '../components/Connections';

interface Props {
  life: LifeApi;
  auth: { user: { email: string | null } | null; available: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> };
}

export const SettingsView: React.FC<Props> = ({ life, auth }) => {
  const prefs = life.store.prefs;
  const [draft, setDraft] = useState<LifePrefs>(prefs);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof LifePrefs>(k: K, v: LifePrefs[K]) => setDraft({ ...draft, [k]: v });

  const exportJson = () => {
    downloadTextFile(`norte-backup-${getTodayDateString()}.json`, JSON.stringify({ app: 'NORTE', version: 1, exportedAt: new Date().toISOString(), data: life.store }, null, 2), 'application/json');
    showToast('Copia de seguridad descargada');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed?.app === 'NORTE' ? parsed.data : parsed?.life;
        if (!data || typeof data !== 'object') throw new Error('formato');
        const mode = window.confirm('¿Reemplazar todo? (Aceptar = reemplazar · Cancelar = combinar con lo actual)') ? 'replace' : 'merge';
        life.restore(data, mode);
        showToast(mode === 'replace' ? 'Datos reemplazados' : 'Datos combinados', { type: 'success' });
      } catch {
        showToast('Ese archivo no es una copia de NORTE válida', { type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader kicker="Configuración" title="Ajustes" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Vos">
          <div className="space-y-4">
            <Field label="¿Cómo te llamo?">
              <input className={inputCls} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Tu nombre" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Me levanto a las" hint="Define el arco del cielo en Hoy">
                <input type="time" className={inputCls} value={draft.wakeTime} onChange={(e) => set('wakeTime', e.target.value)} />
              </Field>
              <Field label="Me acuesto a las">
                <input type="time" className={inputCls} value={draft.sleepTime} onChange={(e) => set('sleepTime', e.target.value)} />
              </Field>
            </div>
            <Field label="Tema" group>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['dark', 'Noche', <Moon key="d" className="w-4 h-4" />],
                  ['light', 'Día', <Sun key="l" className="w-4 h-4" />],
                  ['system', 'Automático', <SunMoon key="s" className="w-4 h-4" />],
                ] as const).map(([k, l, icon]) => (
                  <button key={k} type="button" onClick={() => set('theme', k)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-full border text-sm font-semibold cursor-pointer ${draft.theme === k ? 'bg-[var(--text-main)] text-[var(--bg-app)] border-transparent' : 'border-app text-muted'}`}>
                    {icon} {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Metas y tiempos">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estudio por día (min)">
                <input className={inputCls} inputMode="numeric" value={draft.dailyStudyGoalMinutes} onChange={(e) => set('dailyStudyGoalMinutes', Number(e.target.value) || 0)} />
              </Field>
              <Field label="Libros por año">
                <input className={inputCls} inputMode="numeric" value={draft.booksPerYearGoal} onChange={(e) => set('booksPerYearGoal', Number(e.target.value) || 0)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bloque de enfoque (min)">
                <input className={inputCls} inputMode="numeric" value={draft.focusMinutes} onChange={(e) => set('focusMinutes', Number(e.target.value) || 25)} />
              </Field>
              <Field label="Descanso (min)">
                <input className={inputCls} inputMode="numeric" value={draft.breakMinutes} onChange={(e) => set('breakMinutes', Number(e.target.value) || 0)} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            life.setSingleton('prefs', draft);
            showToast('Ajustes guardados');
          }}
        >
          Guardar ajustes
        </button>
      </div>

      <div className="space-y-3" id="conexiones">
        <h2 className="font-display text-2xl font-bold text-main">Conexiones</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <RemindersCard life={life} />
          <CalendarsCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Cuenta y sincronización" icon={<Cloud />}>
          {auth.available ? (
            auth.user ? (
              <div className="space-y-3">
                <p className="text-sm text-main">Sincronizado con {auth.user.email}. Tus datos se guardan en tu cuenta y aparecen en todos tus dispositivos.</p>
                <button type="button" className={btnSecondary} onClick={auth.signOut}>
                  <LogOut className="w-4 h-4" /> Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">Iniciá sesión para tener tus datos en el celu y en la compu.</p>
                <button type="button" className={btnPrimary} onClick={() => auth.signIn().catch(() => showToast('No se pudo iniciar sesión', { type: 'error' }))}>
                  <LogIn className="w-4 h-4" /> Iniciar con Google
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted leading-relaxed">
              Por ahora todo se guarda en este dispositivo. Para sincronizar entre celu y compu hay que conectar tu proyecto de Firebase (el archivo <code className="font-mono text-xs">firebaseConfig.ts</code>). Mientras tanto, usá la copia de seguridad para pasar tus datos.
            </p>
          )}
        </Card>

        <Card title="Copia de seguridad">
          <div className="space-y-3">
            <p className="text-sm text-muted">Descargá todo en un archivo y restauralo en otro dispositivo.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={exportJson}>
                <Download className="w-4 h-4" /> Descargar copia
              </button>
              <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" /> Restaurar copia
              </button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </div>
            <div className="pt-3 border-t border-subtle">
              <button
                type="button"
                className={btnDanger}
                onClick={() => {
                  if (window.confirm('Esto borra todos tus datos de NORTE y vuelve a los iniciales. ¿Seguro?')) {
                    life.reset();
                    showToast('Datos reiniciados');
                  }
                }}
              >
                Reiniciar datos
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Instalar en el iPhone">
        <p className="text-sm text-muted leading-relaxed">
          Abrí NORTE en Safari → botón Compartir → <b className="text-main">Agregar a pantalla de inicio</b>. Se abre como una app, a pantalla completa y sin barra del navegador.
        </p>
      </Card>
    </div>
  );
};
