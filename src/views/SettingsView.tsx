import React, { useState } from 'react';
import { UserSettings, ThemeMode, ACCENT_PALETTE } from '../types/settings';
import { Habit, HabitLog } from '../types/habit';
import { JournalEntry } from '../types/journal';
import { FocusSession } from '../types/focus';
import { LifeStore } from '../types/life';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  createFullBackup,
  downloadBackupFile,
  validateBackupPayload,
  BackupValidationResult,
  ConstanteBackupPayload,
  getPreRestoreSnapshot,
} from '../services/backupService';
import {
  getRedirectUri,
  isSpotifyConnected,
  startSpotifyAuth,
  disconnectSpotify,
} from '../services/spotifyService';
import {
  Moon,
  Sun,
  Laptop,
  Palette,
  Lock,
  Sparkles,
  Key,
  Bell,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Database,
  Check,
  Calendar,
  Music,
  Copy,
  ExternalLink,
  ShieldCheck,
  Undo2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  habits: Habit[];
  logs: Record<string, HabitLog>;
  entries: Record<string, JournalEntry>;
  focusSessions?: FocusSession[];
  onSaveSettings: (settings: Partial<UserSettings>) => void;
  onLoadThreeMonthsDemo: () => void;
  onResetAllData: () => void;
  onRestoreBackup: (backup: ConstanteBackupPayload, mode: 'merge' | 'replace') => Promise<void>;
  onUndoRestore: () => boolean;
  onOpenAiTransparency: () => void;
  lifeStore?: LifeStore;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  habits,
  logs,
  entries,
  focusSessions = [],
  onSaveSettings,
  onLoadThreeMonthsDemo,
  onResetAllData,
  onRestoreBackup,
  onUndoRestore,
  onOpenAiTransparency,
  lifeStore,
}) => {
  const { themeMode, accentColor, effectiveTheme, setThemeMode, setAccentColor } = useThemeContext();
  const { showToast } = useToast();

  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiApiKey || '');
  const [missionInput, setMissionInput] = useState(settings.mission || '');
  const [visionInput, setVisionInput] = useState(settings.vision || '');
  const [pinInput, setPinInput] = useState(settings.journalPin || '');
  const [enablePin, setEnablePin] = useState(settings.hasPin || false);

  // Spotify Settings
  const [spotifyClientIdInput, setSpotifyClientIdInput] = useState(settings.spotifyClientId || '');
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(() => isSpotifyConnected());
  const redirectUri = typeof window !== 'undefined' ? getRedirectUri() : '';

  // Modals
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [importValidationResult, setImportValidationResult] = useState<BackupValidationResult | null>(null);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  const hasUndoAvailable = Boolean(getPreRestoreSnapshot());

  const handleModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    onSaveSettings({ theme: mode });
  };

  const handleAccentChange = (accentVal: string) => {
    setAccentColor(accentVal);
    onSaveSettings({ accentColor: accentVal });
  };

  const handleSaveApiKey = () => {
    onSaveSettings({ geminiApiKey: apiKeyInput.trim() });
    showToast('Clave de API de Gemini guardada correctamente.', { type: 'success' });
  };

  const handleSavePin = () => {
    if (enablePin && pinInput.length !== 4) {
      showToast('El PIN debe tener exactamente 4 dígitos numéricos.', { type: 'warning' });
      return;
    }
    onSaveSettings({
      hasPin: enablePin,
      journalPin: enablePin ? pinInput : '',
    });
    showToast(
      enablePin
        ? 'Bloqueo del diario activado con PIN de 4 dígitos.'
        : 'Bloqueo con PIN desactivado.',
      { type: 'success' }
    );
  };

  // Export full backup
  const handleExportJson = async () => {
    try {
      const backup = await createFullBackup(
        habits,
        logs,
        entries,
        settings,
        focusSessions,
        [],
        [],
        lifeStore
      );
      downloadBackupFile(backup);
      showToast('Copia de seguridad descargada con éxito.', { type: 'success' });
    } catch (err: any) {
      showToast('Error al exportar: ' + err.message, { type: 'error' });
    }
  };

  // Trigger file selection for import
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = JSON.parse(event.target?.result as string);
        const validation = validateBackupPayload(rawJson);

        if (!validation.isValid) {
          showToast(`Archivo no válido: ${validation.errors.join(' ')}`, { type: 'error' });
          return;
        }

        setImportValidationResult(validation);
        setIsImportPreviewOpen(true);
      } catch {
        showToast('El archivo seleccionado no es un JSON válido.', { type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!importValidationResult?.sanitizedData) return;
    setIsRestoring(true);

    try {
      await onRestoreBackup(importValidationResult.sanitizedData, importMode);
      setIsImportPreviewOpen(false);
      showToast(
        importMode === 'replace'
          ? 'Datos restaurados por completo.'
          : 'Datos combinados exitosamente con tus registros actuales.',
        {
          type: 'success',
          actionLabel: 'Deshacer',
          onAction: () => {
            const ok = onUndoRestore();
            if (ok) showToast('Importación deshecha. Se restauró el estado previo.', { type: 'info' });
          },
        }
      );
    } catch (err: any) {
      showToast('Error al restaurar los datos: ' + err.message, { type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Undo last import
  const handleUndoImport = () => {
    const ok = onUndoRestore();
    if (ok) {
      showToast('Se restauró el estado anterior a la última importación.', { type: 'info' });
    } else {
      showToast('No hay ninguna copia previa para deshacer.', { type: 'warning' });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = 'ID,Nombre,Categoría,Tipo,Meta,Frecuencia,Estado\n';
    habits.forEach((h) => {
      csv += `"${h.id}","${h.name}","${h.category}","${h.type}","${h.targetValue || ''}","${h.frequencyType}","${h.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `constante-habitos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Planilla de hábitos exportada en CSV.', { type: 'success' });
  };

  // Spotify Handlers
  const handleSaveSpotifyClientId = () => {
    onSaveSettings({ spotifyClientId: spotifyClientIdInput.trim() });
    showToast('Client ID de Spotify guardado.', { type: 'success' });
  };

  const handleConnectSpotify = async () => {
    const id = spotifyClientIdInput.trim() || settings.spotifyClientId;
    if (!id) {
      showToast('Ingresá tu Client ID de Spotify primero.', { type: 'warning' });
      return;
    }
    try {
      await startSpotifyAuth(id);
    } catch (err: any) {
      showToast(err.message, { type: 'error' });
    }
  };

  const handleDisconnectSpotify = () => {
    disconnectSpotify();
    setSpotifyConnected(false);
    showToast('Sesión de Spotify desconectada.', { type: 'info' });
  };

  const handleCopyRedirectUri = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(redirectUri);
      showToast('URL de redirección copiada al portapapeles.', { type: 'success' });
    }
  };

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onSaveSettings({ notificationsEnabled: true });
        showToast('Notificaciones habilitadas para las 21:00 hs.', { type: 'success' });
      } else {
        onSaveSettings({ notificationsEnabled: false });
        showToast('Permiso de notificaciones denegado en el navegador.', { type: 'warning' });
      }
    } else {
      showToast('Este navegador no soporta la API de notificaciones.', { type: 'warning' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header bar */}
      <div className="pb-4 border-b border-app">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
          PREFERENCIAS DEL SISTEMA
        </span>
        <h2 className="font-['Oswald'] text-3xl sm:text-4xl font-bold uppercase tracking-wider text-main mt-0.5">
          Ajustes
        </h2>
      </div>

      {/* 1. TEMA Y APARIENCIA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
            <Palette className="w-5 h-5 text-accent" />
            <span>Apariencia & Estilo Editorial</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Personalizá la paleta de tinta y el modo visual de la aplicación.
          </p>
        </div>

        {/* Modo de color */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Modo de Pantalla
          </label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { id: 'light', label: 'Claro (Papel)', icon: <Sun className="w-4 h-4" /> },
              { id: 'dark', label: 'Oscuro (Tinta)', icon: <Moon className="w-4 h-4" /> },
              { id: 'system', label: 'Automático', icon: <Laptop className="w-4 h-4" /> },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleModeChange(t.id as ThemeMode)}
                className={`py-3 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer min-h-[44px] ${
                  themeMode === t.id
                    ? 'border-app bg-accent text-accent-contrast font-bold shadow-xs'
                    : 'border-app bg-surface-elevated text-muted hover:text-main'
                }`}
              >
                {t.icon}
                <span className="text-xs leading-none">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color de acento */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Color de Acento de Sello & Checks
          </label>
          <div role="radiogroup" aria-label="Color de acento" className="flex flex-wrap gap-3">
            {ACCENT_PALETTE.map((pal) => {
              const isSelected = accentColor === pal.value;
              const displayColor =
                pal.value === 'ink'
                  ? effectiveTheme === 'dark'
                    ? '#F5F5F0'
                    : '#141412'
                  : pal.value;

              return (
                <button
                  key={pal.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleAccentChange(pal.value)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'border-app bg-surface-elevated font-bold ring-2 ring-accent'
                      : 'border-app bg-surface hover:bg-surface-elevated'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-xs border border-app"
                    style={{ backgroundColor: displayColor }}
                  />
                  <span className="text-xs text-main">{pal.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. INTELIGENCIA ARTIFICIAL (GEMINI) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span>Funciones de Inteligencia Artificial (Gemini)</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Transcripción de voz, digitalización de manuscritos y balances mensuales.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAiTransparency}
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Qué datos se envían a la IA</span>
          </button>
        </div>

        {/* AI Enabled Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-app">
          <div>
            <p className="text-xs font-bold text-main">
              Habilitar procesamiento con IA
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Si se desactiva, ninguna solicitud se enviará a los servidores de Gemini y la edición será 100% manual y local.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.aiEnabled !== false}
            onChange={(e) => {
              onSaveSettings({ aiEnabled: e.target.checked });
              showToast(
                e.target.checked
                  ? 'Funciones de IA habilitadas.'
                  : 'Funciones de IA deshabilitadas.',
                { type: 'info' }
              );
            }}
            className="w-5 h-5 accent-[var(--color-accent)] rounded cursor-pointer min-h-[24px]"
            aria-label="Habilitar procesamiento con IA"
          />
        </div>

        {/* Toggle auto summary */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-app">
          <div>
            <p className="text-xs font-bold text-main">
              Resumen automático y sugerencia de etiquetas
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Al guardar una grabación, Gemini genera automáticamente una síntesis de 2 oraciones y 3 etiquetas temáticas.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoAiSummary}
            onChange={(e) => onSaveSettings({ autoAiSummary: e.target.checked })}
            className="w-5 h-5 accent-[var(--color-accent)] rounded cursor-pointer min-h-[24px]"
            aria-label="Resumen automático y etiquetas"
          />
        </div>

        {/* Gemini API Key input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Clave de API de Gemini (Opcional)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Ingresá tu clave de API si deseás usar una propia..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-app bg-surface-elevated text-xs font-mono text-main focus:outline-hidden focus:border-accent min-h-[44px]"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer min-h-[44px]"
            >
              Guardar
            </button>
          </div>
          <p className="text-[11px] text-muted mt-1">
            Si dejás este campo vacío, la aplicación usará la clave del servidor configurada en el entorno.
          </p>
        </div>

        {/* Misión y Visión de vida para el coach de Gemini */}
        <div className="pt-4 border-t border-app space-y-4">
          <div>
            <h4 className="font-['Oswald'] text-base font-bold uppercase tracking-wider text-main">
              Misión & Visión de Vida (Para el Coach de Balance)
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Si las completás, los balances mensuales de Gemini alinearán sus reflexiones y sugerencias con tus propósitos.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                Tu Misión Personal
              </label>
              <textarea
                rows={2}
                value={missionInput}
                onChange={(e) => setMissionInput(e.target.value)}
                placeholder="Ej: Vivir con presencia, disciplina física y crear valor constante sin descuidar a mi familia..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-app bg-surface-elevated text-xs text-main focus:outline-hidden focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                Tu Visión a Largo Plazo
              </label>
              <textarea
                rows={2}
                value={visionInput}
                onChange={(e) => setVisionInput(e.target.value)}
                placeholder="Ej: Construir una mente serena, un cuerpo fuerte y sostener hábitos que perduren por décadas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-app bg-surface-elevated text-xs text-main focus:outline-hidden focus:border-accent"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onSaveSettings({
                    mission: missionInput.trim(),
                    vision: visionInput.trim(),
                  });
                  showToast('Misión y Visión guardadas.', { type: 'success' });
                }}
                className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer min-h-[44px]"
              >
                Guardar Misión y Visión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTEGRACIÓN CON SPOTIFY */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
            <Music className="w-5 h-5 text-emerald-500" />
            <span>Integración con Spotify</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Conectá tu cuenta de Spotify mediante PKCE seguro para controlar música directamente durante el enfoque.
          </p>
        </div>

        {/* Redirect URI with copy button */}
        <div className="p-4 rounded-2xl bg-surface-elevated border border-app space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-main">URL de Redirección Exacta (Redirect URI)</span>
            <button
              type="button"
              onClick={handleCopyRedirectUri}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar URL</span>
            </button>
          </div>
          <code className="block p-2 rounded-xl bg-surface border border-app font-mono text-[11px] text-muted break-all">
            {redirectUri}
          </code>
          <p className="text-[11px] text-muted leading-relaxed">
            Pegá esta URL en tu Dashboard de Desarrollador de Spotify en <em>Redirect URIs</em>. No se requiere Client Secret.
          </p>
        </div>

        {/* Client ID input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
            Client ID de Spotify (Público)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={spotifyClientIdInput}
              onChange={(e) => setSpotifyClientIdInput(e.target.value)}
              placeholder="Ej: a1b2c3d4e5f6..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-app bg-surface-elevated text-xs font-mono text-main focus:outline-hidden focus:border-accent min-h-[44px]"
            />
            <button
              type="button"
              onClick={handleSaveSpotifyClientId}
              className="px-4 py-2 rounded-xl border border-app hover:bg-surface-elevated text-xs font-bold uppercase tracking-wider transition cursor-pointer min-h-[44px]"
            >
              Guardar ID
            </button>
          </div>
        </div>

        {/* Connect / Disconnect buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-elevated border border-app">
          <div>
            <p className="text-xs font-bold text-main flex items-center gap-2">
              <span>Estado de la conexión:</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold ${
                spotifyConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted/10 text-muted'
              }`}>
                {spotifyConnected ? 'Conectado' : 'Sin conectar'}
              </span>
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Requiere Spotify Premium para controlar la reproducción de canciones completas desde la app.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {spotifyConnected ? (
              <button
                type="button"
                onClick={handleDisconnectSpotify}
                className="px-4 py-2 rounded-xl border border-app hover:bg-surface text-xs font-bold text-red-500 transition cursor-pointer min-h-[44px]"
              >
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectSpotify}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold uppercase tracking-wider transition cursor-pointer min-h-[44px]"
              >
                Conectar con Spotify
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. SEGURIDAD: PIN DEL DIARIO */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            <span>Bloqueo del Diario con PIN</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Protegé la visualización de tus grabaciones y reflexiones personales en este dispositivo.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-app">
          <div>
            <p className="text-xs font-bold text-main">
              Activar protección con PIN local
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Se solicitará el PIN cada vez que ingreses a la pestaña de Diario. (Bloqueo de interfaz local en este dispositivo).
            </p>
          </div>
          <input
            type="checkbox"
            checked={enablePin}
            onChange={(e) => setEnablePin(e.target.checked)}
            className="w-5 h-5 accent-[var(--color-accent)] rounded cursor-pointer min-h-[24px]"
            aria-label="Activar protección con PIN"
          />
        </div>

        {enablePin && (
          <div className="flex items-center gap-3">
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              aria-label="PIN de 4 dígitos"
              className="w-28 text-center px-3.5 py-2 rounded-xl border border-app bg-surface-elevated text-lg font-mono font-bold tracking-widest text-main min-h-[44px]"
            />
            <button
              type="button"
              onClick={handleSavePin}
              className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer min-h-[44px]"
            >
              Confirmar PIN
            </button>
          </div>
        )}
      </div>

      {/* 5. NOTIFICACIONES & RECORDATORIOS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-4 shadow-xs">
        <div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            <span>Notificaciones & Recordatorios Diarios</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Recibí un aviso suave a la noche para tildar tus hábitos y reflexionar sobre la jornada.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-elevated border border-app">
          <div>
            <p className="text-xs font-bold text-main">
              Recordatorio diario del navegador
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              Hora sugerida: 21:00 hs (Buenos Aires). En iPhone, agregá la app a Inicio para recibir avisos del sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestNotifications}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer min-h-[44px] ${
              settings.notificationsEnabled
                ? 'bg-accent text-accent-contrast'
                : 'bg-surface-elevated text-main hover:bg-surface-muted border border-app'
            }`}
          >
            {settings.notificationsEnabled ? 'Notificaciones Habilitadas' : 'Activar Recordatorio'}
          </button>
        </div>
      </div>

      {/* 6. GESTIÓN DE DATOS & COPIAS DE SEGURIDAD */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-app space-y-6 shadow-xs">
        <div>
          <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            <span>Gestión de Datos & Copias de Seguridad</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Exportá tu historial, restaurá respaldos con vista previa o gestioná tus registros.
          </p>
        </div>

        {/* Undo import button if snapshot exists */}
        {hasUndoAvailable && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Undo2 className="w-4 h-4 shrink-0" />
              <span>Hay una copia previa disponible antes de tu última importación.</span>
            </div>
            <button
              type="button"
              onClick={handleUndoImport}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-amber-700 transition cursor-pointer min-h-[36px]"
            >
              Deshacer importación
            </button>
          </div>
        )}

        {/* Monthly Backup Reminder */}
        <div className="p-4 rounded-2xl bg-surface-elevated border border-app flex items-start gap-3 text-xs">
          <Calendar className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-main">Respaldo Mensual Recomendado</p>
            <p className="text-muted mt-0.5">
              Descargá un archivo JSON mensual para conservar copias seguras de tus notas, audios y hábitos.
            </p>
          </div>
        </div>

        {/* Demo data loader */}
        <div className="p-4 rounded-2xl bg-surface-elevated border border-app flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-main">
              Cargar datos de ejemplo (3 meses de historial)
            </p>
            <p className="text-[11px] text-muted">
              Poblá la app con 90 días de hábitos tildados y entradas de audio para probar las estadísticas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onLoadThreeMonthsDemo();
              showToast('Datos de ejemplo cargados (90 días).', { type: 'info' });
            }}
            className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider shrink-0 transition cursor-pointer min-h-[44px]"
          >
            Cargar 3 Meses Demo
          </button>
        </div>

        {/* Export / Import buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-app bg-surface hover:bg-surface-elevated text-xs font-semibold text-main transition cursor-pointer min-h-[44px]"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>Exportar Todo (JSON)</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-app bg-surface hover:bg-surface-elevated text-xs font-semibold text-main transition cursor-pointer min-h-[44px]">
            <Upload className="w-4 h-4 text-accent" />
            <span>Importar desde JSON</span>
            <input type="file" accept=".json" onChange={handleFileSelected} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-app bg-surface hover:bg-surface-elevated text-xs font-semibold text-main transition cursor-pointer min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4 text-accent" />
            <span>Exportar Hábitos (CSV)</span>
          </button>
        </div>

        {/* Clear all data */}
        <div className="pt-4 border-t border-app flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted">
              Borrar todos los datos locales
            </p>
            <p className="text-[11px] text-muted">
              Elimina todos los registros de hábitos y entradas del diario en este dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-elevated text-muted hover:text-main text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            Restablecer
          </button>
        </div>
      </div>

      {/* Import Preview Modal */}
      {isImportPreviewOpen && importValidationResult && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md bg-surface border border-app rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-main">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
                  VISTA PREVIA DEL RESPALDO
                </span>
                <h3 id="import-preview-title" className="text-xl font-bold font-['Oswald'] uppercase tracking-wider text-main mt-0.5">
                  Restaurar Copia de Seguridad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportPreviewOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-app/60 space-y-2 text-xs">
              <p className="font-bold text-main">Contenido detectado en el archivo:</p>
              <ul className="space-y-1 text-muted">
                <li>• <strong>{importValidationResult.preview.habitsCount}</strong> hábitos</li>
                <li>• <strong>{importValidationResult.preview.logsCount}</strong> días con registros</li>
                <li>• <strong>{importValidationResult.preview.entriesCount}</strong> entradas de diario</li>
                <li>• <strong>{importValidationResult.preview.focusSessionsCount}</strong> sesiones de enfoque</li>
                {importValidationResult.preview.mediaFilesCount > 0 && (
                  <li>• <strong>{importValidationResult.preview.mediaFilesCount}</strong> archivos multimedia</li>
                )}
              </ul>
            </div>

            {/* Mode selection: Merge vs Replace */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                ¿Cómo deseás aplicar los datos?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition cursor-pointer ${
                    importMode === 'merge'
                      ? 'border-accent bg-accent-subtle text-main ring-1 ring-accent'
                      : 'border-app bg-surface-elevated text-muted hover:text-main'
                  }`}
                >
                  <p className="font-bold text-main">Combinar</p>
                  <p className="text-[10px] text-muted mt-0.5">Conserva tus registros actuales y suma los nuevos.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-3 rounded-2xl border text-xs font-semibold text-left transition cursor-pointer ${
                    importMode === 'replace'
                      ? 'border-accent bg-accent-subtle text-main ring-1 ring-accent'
                      : 'border-app bg-surface-elevated text-muted hover:text-main'
                  }`}
                >
                  <p className="font-bold text-main">Reemplazar</p>
                  <p className="text-[10px] text-muted mt-0.5">Sustituye todo el historial por el del archivo.</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-app">
              <button
                type="button"
                onClick={() => setIsImportPreviewOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-app text-xs font-semibold text-muted hover:text-main transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? 'Restaurando…' : 'Restaurar Respaldo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="¿Restablecer todos los datos?"
        message="Esta acción borrará todo el historial de hábitos, grabaciones y ajustes locales en este dispositivo. Volverás a los hábitos iniciales de fábrica."
        confirmLabel="Sí, borrar todo"
        isDestructive={true}
        onConfirm={() => {
          onResetAllData();
          setResetConfirmOpen(false);
          showToast('Datos locales restablecidos.', { type: 'info' });
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
};
