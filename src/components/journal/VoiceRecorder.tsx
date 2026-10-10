import React, { useState, useRef } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface VoiceRecorderProps {
  dateStr: string;
  hasExistingEntry: boolean;
  onSaveAudio: (payload: {
    audioBase64: string;
    audioMimeType: string;
    durationSeconds: number;
    mode: 'replace' | 'append';
  }) => void;
  onCancel?: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  dateStr,
  hasExistingEntry,
  onSaveAudio,
  onCancel,
}) => {
  const {
    state,
    duration,
    audioUrl,
    audioBase64,
    mimeType,
    waveformLevels,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  } = useAudioRecorder();

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showReplaceModal, setShowReplaceModal] = useState<boolean>(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  const handleSaveTrigger = () => {
    if (!audioBase64) return;
    if (hasExistingEntry) {
      setShowReplaceModal(true);
    } else {
      onSaveAudio({
        audioBase64,
        audioMimeType: mimeType,
        durationSeconds: duration,
        mode: 'replace',
      });
      resetRecording();
    }
  };

  const confirmSaveWithMode = (mode: 'replace' | 'append') => {
    if (!audioBase64) return;
    onSaveAudio({
      audioBase64,
      audioMimeType: mimeType,
      durationSeconds: duration,
      mode,
    });
    setShowReplaceModal(false);
    resetRecording();
  };

  return (
    <div className="rounded-3xl bg-surface border border-app p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-app">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted font-bold">
            GRABACIÓN DE VOZ
          </span>
          <h3 className="font-['Oswald'] text-2xl font-bold uppercase tracking-wider text-main mt-0.5">
            Bitácora del {dateStr}
          </h3>
        </div>

        {state === 'idle' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-muted hover:text-main cursor-pointer"
          >
            Cerrar
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="my-4 p-3.5 rounded-2xl bg-accent-subtle border border-accent flex items-start gap-3 text-xs text-accent">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* RECORDING / IDLE STATE */}
      {state === 'idle' && (
        <div className="py-10 flex flex-col items-center justify-center text-center">
          <button
            type="button"
            onClick={startRecording}
            className="w-24 h-24 rounded-full bg-accent text-accent-contrast flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer"
            aria-label="Iniciar grabación"
          >
            <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
          </button>
          <p className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main mt-5">
            Tocá para grabar tu día
          </p>
          <p className="text-xs text-muted max-w-sm mt-1">
            Hablale a la bitácora libremente. Al guardar, Gemini transcribirá tu voz fielmente respetando modismos argentinos.
          </p>
        </div>
      )}

      {/* LIVE RECORDING STATE */}
      {(state === 'recording' || state === 'paused') && (
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
          {/* Stopwatch */}
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                state === 'recording' ? 'bg-accent animate-pulse' : 'bg-muted'
              }`}
            />
            <span className="font-mono text-4xl sm:text-5xl font-black text-main tracking-wider">
              {formatTime(duration)}
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {state === 'recording' ? 'Grabando audio en vivo...' : 'Grabación en pausa'}
          </p>

          {/* Live Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-md px-4">
            {waveformLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="w-2 rounded-full transition-all duration-75"
                style={{
                  height: state === 'recording' ? `${Math.max(8, lvl * 64)}px` : '8px',
                  backgroundColor:
                    state === 'recording' ? 'var(--color-accent)' : 'var(--text-muted)',
                }}
              />
            ))}
          </div>

          {/* Controls: Pause/Resume, Stop, Cancel */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-3 rounded-2xl bg-surface-elevated text-muted hover:text-main transition cursor-pointer"
              title="Cancelar grabación"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {state === 'recording' ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="p-4 rounded-2xl bg-surface-elevated text-main hover:bg-surface-muted transition cursor-pointer"
                title="Pausar"
              >
                <Pause className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="p-4 rounded-2xl bg-accent text-accent-contrast transition cursor-pointer"
                title="Reanudar"
              >
                <Play className="w-6 h-6" />
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="p-4 rounded-2xl bg-accent text-accent-contrast shadow-md hover:opacity-90 transition cursor-pointer"
              title="Detener y revisar"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* STOPPED / PREVIEW PLAYBACK STATE */}
      {state === 'stopped' && audioUrl && (
        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-muted" />
              <span className="font-mono text-sm font-bold text-main">
                Duración: {formatTime(duration)}
              </span>
            </div>

            {/* Playback Speed selector */}
            <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-0.5 text-xs font-mono font-bold">
              {[1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-accent text-accent-contrast'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* HTML5 Audio Player */}
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="w-full"
            controls
          />

          {/* Action buttons: Re-record, Discard, Save & Transcribe */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-app">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetRecording}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-app text-xs font-semibold text-main hover:bg-surface-elevated transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Volver a grabar
              </button>
              <button
                type="button"
                onClick={resetRecording}
                className="p-2.5 rounded-xl text-muted hover:text-accent transition cursor-pointer"
                title="Descartar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveTrigger}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Guardar y Transcribir
            </button>
          </div>
        </div>
      )}

      {/* Modal if existing recording already exists for this day */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-app text-main">
            <h4 className="font-['Oswald'] text-lg font-bold uppercase tracking-wider text-main">
              Entrada ya existente
            </h4>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Ya tenés una grabación para el día {dateStr}. ¿Qué deseás hacer con el nuevo audio?
            </p>

            <div className="space-y-2.5 mt-5">
              <button
                type="button"
                onClick={() => confirmSaveWithMode('append')}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-elevated hover:bg-surface-muted text-main text-xs font-bold text-left transition cursor-pointer"
              >
                ➕ Agregar al final (concatenar a la entrada)
              </button>
              <button
                type="button"
                onClick={() => confirmSaveWithMode('replace')}
                className="w-full py-2.5 px-4 rounded-xl bg-accent-subtle text-accent text-xs font-bold text-left transition cursor-pointer"
              >
                ⚠️ Reemplazar audio anterior
              </button>
              <button
                type="button"
                onClick={() => setShowReplaceModal(false)}
                className="w-full py-2 text-center text-xs text-muted font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
