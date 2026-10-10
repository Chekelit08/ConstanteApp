import React, { useState } from 'react';
import { Sparkles, ShieldAlert, Check, X } from 'lucide-react';

interface AiTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (dontShowAgain: boolean) => void;
  onDisableAi: () => void;
}

export const AiTransparencyModal: React.FC<AiTransparencyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDisableAi,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-transparency-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-surface border border-app rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-main">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-muted">
                Transparencia & Privacidad
              </span>
              <h3 id="ai-transparency-title" className="text-lg sm:text-xl font-bold font-['Oswald'] uppercase tracking-wider text-main">
                Uso de Inteligencia Artificial (Gemini)
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface-elevated transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Clear Points */}
        <div className="space-y-3.5 text-xs sm:text-sm text-muted">
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app/60 space-y-1">
            <div className="font-bold text-main flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center text-[10px] font-mono">1</span>
              <span>QUÉ se envía</span>
            </div>
            <p className="pl-7 text-[13px] leading-relaxed">
              Únicamente los datos necesarios para la función que elijas: tus audios para transcribir, texto o fotos de escritura a mano para digitalizar, o estadísticas de hábitos y notas al generar un balance o resumen.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app/60 space-y-1">
            <div className="font-bold text-main flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center text-[10px] font-mono">2</span>
              <span>A QUIÉN se envía</span>
            </div>
            <p className="pl-7 text-[13px] leading-relaxed">
              A la API de Gemini de Google. Los datos se procesan en sus servidores conforme a las condiciones y políticas del servicio de Google. No hacemos promesas absolutas de privacidad: si preferís no compartir estos datos, podés desactivar la IA en cualquier momento.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-app/60 space-y-1">
            <div className="font-bold text-main flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent text-accent-contrast flex items-center justify-center text-[10px] font-mono">3</span>
              <span>DÓNDE queda guardado</span>
            </div>
            <p className="pl-7 text-[13px] leading-relaxed">
              Todos los resultados (textos, balances, fotos y audios) se almacenan de forma local en este dispositivo. Solo se suben a tu cuenta si activaste la sincronización en la nube.
            </p>
          </div>
        </div>

        {/* Checkbox "No volver a mostrar" */}
        <label className="flex items-center gap-3 p-2 text-xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-app accent-[var(--color-accent)] cursor-pointer"
          />
          <span>No volver a mostrar este aviso en este dispositivo</span>
        </label>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-app">
          <button
            type="button"
            onClick={onDisableAi}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app hover:bg-surface-elevated text-xs font-bold uppercase tracking-wider text-muted hover:text-main transition cursor-pointer"
          >
            Desactivar funciones de IA
          </button>
          <button
            type="button"
            onClick={() => onAccept(dontShowAgain)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
