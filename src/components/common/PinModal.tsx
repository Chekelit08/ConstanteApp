import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface PinModalProps {
  correctPin: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  title?: string;
  subtitle?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  correctPin,
  onSuccess,
  onCancel,
  onClose,
  isOpen = true,
  title = 'Diario Protegido',
  subtitle = 'Ingresá tu PIN de 4 dígitos para acceder a tus grabaciones personales.',
}) => {
  if (isOpen === false) return null;
  const handleClose = onCancel || onClose || (() => {});
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  }, [pin, correctPin, onSuccess]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xs rounded-3xl bg-surface p-6 text-center shadow-2xl border border-app animate-in zoom-in-95 text-main">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center mb-4 shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="font-['Oswald'] text-xl font-bold uppercase tracking-wider text-main">
          {title}
        </h3>
        <p className="text-xs text-muted mt-1 mb-6">
          {subtitle}
        </p>

        {/* PIN Dots */}
        <div className={`flex justify-center gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? error
                    ? 'bg-accent scale-125'
                    : 'bg-accent scale-110'
                  : 'bg-surface-elevated border border-app'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-accent font-semibold mb-4 -mt-4">
            PIN incorrecto. Reintentá.
          </p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="w-16 h-16 rounded-2xl bg-surface-elevated border border-app text-lg font-bold text-main hover:bg-surface-muted active:scale-95 transition flex items-center justify-center shadow-xs cursor-pointer"
            >
              {digit}
            </button>
          ))}
          {onCancel || onClose ? (
            <button
              type="button"
              onClick={handleClose}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xs font-semibold text-muted hover:text-main transition cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-16 h-16 rounded-2xl bg-surface-elevated border border-app text-lg font-bold text-main hover:bg-surface-muted active:scale-95 transition flex items-center justify-center shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-sm font-semibold text-muted hover:text-main transition cursor-pointer"
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
};
