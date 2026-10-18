import React, { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { LifeApi } from '../hooks/useLifeData';
import { createPersonalStore } from '../services/lifeSeed';
import { markVaultDone, openVault } from '../services/vault';
import { btnGhost, btnPrimary, inputCls } from './ui';

/** Primera apertura en un dispositivo: desbloquea tus datos personales cifrados */
export const UnlockScreen: React.FC<{ life: LifeApi; onDone: () => void }> = ({ life, onDone }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const unlock = async () => {
    setBusy(true);
    setError('');
    try {
      const seed = await openVault(key);
      life.restore(createPersonalStore(seed), 'replace');
      markVaultDone();
      onDone();
    } catch {
      setError('Esa clave no abre tus datos. Revisala e intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto" style={{ background: 'linear-gradient(180deg,#070a1c 0%,#1d1f4f 55%,#6a3f7a 85%,#e2718a 100%)' }}>
      <div className="min-h-full max-w-md mx-auto px-6 py-12 flex flex-col justify-center text-white safe-top safe-bottom">
        <div className="w-14 h-14 rounded-full bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-md">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-display text-5xl font-bold mt-6 leading-none">NORTE</h1>
        <p className="text-white/80 mt-3 leading-relaxed">Tus datos personales están cifrados dentro de la app. Ingresá tu clave para abrirlos en este dispositivo. Se pide una sola vez.</p>
        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) unlock();
          }}
        >
          <label className="block">
            <span className="text-sm text-white/75">Clave</span>
            <div className="relative mt-1.5">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
              <input autoFocus autoCapitalize="none" autoCorrect="off" className={`${inputCls} pl-10`} value={key} onChange={(e) => setKey(e.target.value)} placeholder="palabra-0000-palabra" />
            </div>
          </label>
          {error && <p className="text-sm text-[#ffd0d6]">{error}</p>}
          <button type="submit" className={`${btnPrimary} w-full min-h-[50px]`} disabled={busy || !key.trim()}>
            {busy ? 'Abriendo…' : 'Abrir mis datos'}
          </button>
          <button
            type="button"
            className={`${btnGhost} w-full !text-white/70 hover:!text-white hover:!bg-white/10`}
            onClick={() => {
              markVaultDone();
              onDone();
            }}
          >
            Empezar sin mis datos
          </button>
        </form>
      </div>
    </div>
  );
};
