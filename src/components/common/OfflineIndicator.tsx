import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-surface-elevated text-main px-4 py-2.5 text-xs font-semibold shadow-xl border border-app animate-in fade-in slide-in-from-bottom-2">
      <WifiOff className="w-4 h-4 text-accent shrink-0" />
      <span>Modo sin conexión — Tus hábitos y grabaciones se guardan localmente.</span>
    </div>
  );
};
