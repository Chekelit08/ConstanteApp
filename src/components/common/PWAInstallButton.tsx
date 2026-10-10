import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, suppress
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop prompt
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-contrast px-3.5 py-2 text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition shadow-xs cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Instalar Aplicación
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-app bg-surface-elevated hover:bg-surface-muted px-3 py-1.5 text-xs font-medium text-main transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-accent" />
          Instalar en iPhone / iPad
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl border border-app text-main">
              <div className="flex items-center justify-between pb-3 border-b border-app">
                <h3 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
                  Instalar en iOS (Safari)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-muted hover:text-main cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-contrast font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p>
                    Tocá el botón <strong>Compartir</strong> (ícono de caja con flecha hacia arriba) en la barra de Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-contrast font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p>
                    Deslizá hacia abajo y seleccioná <strong>"Agregar a Inicio"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-contrast font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <p>
                    Tocá <strong>Agregar</strong> para disfrutar de la experiencia pantalla completa en tu dispositivo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-accent text-accent-contrast py-2.5 text-xs font-semibold uppercase tracking-wider transition hover:opacity-90 shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
