import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
  showToast: (text: string, options?: { actionLabel?: string; onAction?: () => void; type?: 'info' | 'success' | 'warning' | 'error' }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback(
    (
      text: string,
      options?: { actionLabel?: string; onAction?: () => void; type?: 'info' | 'success' | 'warning' | 'error' }
    ) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const id = Date.now().toString();
      setToast({
        id,
        text,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
        type: options?.type || 'info',
      });

      timerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 4000); // 4 seconds auto dismiss
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-[80] max-w-[92vw] sm:max-w-md w-auto"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-[var(--text-main)] text-[var(--bg-app)] shadow-2xl text-sm font-medium animate-rise">
            <span className="flex-1 break-words">{toast.text}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="px-2.5 py-1 rounded-full bg-accent text-accent-contrast font-semibold text-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Cerrar aviso"
              className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

const fallbackToastContext: ToastContextType = {
  showToast: (text, options) => {
    console.info(`[Toast fallback] ${text}`, options);
  },
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    return fallbackToastContext;
  }
  return context;
}
