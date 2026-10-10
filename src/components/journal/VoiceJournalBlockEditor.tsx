import React, { useState, useRef, useEffect } from 'react';
import { JournalBlockVoice } from '../../types/journal';
import {
  getSupportedMimeType,
  convertBlobToWav,
  blobToBase64,
  checkMicrophonePermission,
} from '../../utils/audioUtils';
import { transcribeAudioApi } from '../../services/geminiClient';
import { saveMediaItem } from '../../services/mediaStorage';
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
  Upload,
  ExternalLink,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface VoiceJournalBlockEditorProps {
  block: JournalBlockVoice;
  geminiApiKey?: string;
  onUpdate: (updatedBlock: JournalBlockVoice) => void;
  onDelete: (blockId: string) => void;
}

type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'paused'
  | 'stopped';

export const VoiceJournalBlockEditor: React.FC<VoiceJournalBlockEditorProps> = ({
  block,
  geminiApiKey,
  onUpdate,
  onDelete,
}) => {
  const [recState, setRecState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState<number>(block.durationSeconds || 0);
  const [time, setTime] = useState<string>(block.time || '12:00');
  const [audioBase64, setAudioBase64] = useState<string | null>(block.audioData || null);
  const [mimeType, setMimeType] = useState<string>(block.audioMimeType || 'audio/webm');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<string>(
    block.transcriptEdited || block.transcriptOriginal || ''
  );
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'completed' | 'error'>(
    block.status || 'idle'
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(block.errorMessage || null);
  const [helpGuideVisible, setHelpGuideVisible] = useState<boolean>(false);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(new Array(16).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const blockRef = useRef(block);
  const onUpdateRef = useRef(onUpdate);
  const durationRef = useRef(duration);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    blockRef.current = block;
    onUpdateRef.current = onUpdate;
  }, [block, onUpdate]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
  }, []);

  // Cleanup
  const cleanupNodes = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupNodes();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Live waveform visualizer
  const runWaveform = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const bands = 16;
    const step = Math.floor(dataArray.length / bands);
    const levels: number[] = [];
    for (let i = 0; i < bands; i++) {
      const v = dataArray[i * step] || 0;
      levels.push(Math.max(0.12, v / 255));
    }
    setWaveformLevels(levels);
    animFrameRef.current = requestAnimationFrame(runWaveform);
  };

  // Start recording with full diagnostics
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setHelpGuideVisible(false);
    setRecState('requesting_permission');

    try {
      cleanupNodes();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta captura de audio (getUserMedia).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // AudioContext analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const chosenMime = getSupportedMimeType();
      setMimeType(chosenMime);

      const recorder = new MediaRecorder(stream, { mimeType: chosenMime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || chosenMime,
        });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        const b64 = await blobToBase64(recordedBlob);
        setAudioBase64(b64);
        setRecState('stopped');

        const currentDur = durationRef.current || 1;

        // Persist media to IndexedDB storage
        await saveMediaItem(`audio-${block.id}`, b64, chosenMime).catch(() => {});

        // Save audio data and metadata into the block BEFORE starting transcription
        onUpdateRef.current({
          ...blockRef.current,
          audioData: b64,
          audioMimeType: chosenMime,
          durationSeconds: currentDur,
          time,
        });

        // Automatically trigger transcribe
        triggerTranscribe(b64, chosenMime, currentDur, recordedBlob);
      };

      recorder.start(250);
      setRecState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      runWaveform();
    } catch (err: any) {
      console.error('Error starting recording:', err);
      cleanupNodes();
      setRecState('idle');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso del micrófono denegado por el navegador o sistema.');
        setHelpGuideVisible(true);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ningún micrófono conectado en este dispositivo.');
        setHelpGuideVisible(true);
      } else if (!window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setErrorMessage('Se requiere conexión segura (HTTPS) para usar el micrófono.');
        setHelpGuideVisible(true);
      } else {
        setErrorMessage(`Error al grabar: ${err.message || 'Fallo desconocido'}`);
        setHelpGuideVisible(true);
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recState === 'recording') {
      mediaRecorderRef.current.stop();
      cleanupNodes();
    }
  };

  // Upload an audio file from device (fallback with accurate metadata duration)
  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setHelpGuideVisible(false);
    try {
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);

      const b64 = await blobToBase64(file);
      setAudioBase64(b64);
      setRecState('stopped');

      const mime = file.type || 'audio/mp3';
      setMimeType(mime);

      // Measure exact duration using audio element metadata
      const audioProbe = new Audio(url);
      audioProbe.onloadedmetadata = async () => {
        const exactSec = Math.round(audioProbe.duration) || 1;
        setDuration(exactSec);
        durationRef.current = exactSec;

        // Persist media to IndexedDB
        await saveMediaItem(`audio-${block.id}`, b64, mime).catch(() => {});

        // Save original audio and exact duration to block before transcribing
        onUpdateRef.current({
          ...blockRef.current,
          audioData: b64,
          audioMimeType: mime,
          durationSeconds: exactSec,
          time,
        });

        triggerTranscribe(b64, mime, exactSec, file);
      };

      audioProbe.onerror = async () => {
        // Fallback duration if audio metadata couldn't be loaded
        const fallbackSec = Math.max(1, Math.round(file.size / 16000));
        setDuration(fallbackSec);
        durationRef.current = fallbackSec;

        await saveMediaItem(`audio-${block.id}`, b64, mime).catch(() => {});
        onUpdateRef.current({
          ...blockRef.current,
          audioData: b64,
          audioMimeType: mime,
          durationSeconds: fallbackSec,
          time,
        });

        triggerTranscribe(b64, mime, fallbackSec, file);
      };
    } catch (err: any) {
      setErrorMessage(`Error al leer el archivo de audio: ${err.message}`);
    }
  };

  // Transcribe with fallback to WAV conversion ONLY when mime/format error occurs
  const triggerTranscribe = async (
    b64: string,
    mime: string,
    sessionDuration: number = durationRef.current || 1,
    rawBlob?: Blob
  ) => {
    setStatus('transcribing');
    setErrorMessage(null);

    try {
      let resultText = '';
      try {
        resultText = await transcribeAudioApi(b64, mime, geminiApiKey);
      } catch (firstErr: any) {
        const errStr = String(firstErr?.message || '').toLowerCase();
        const isFormatIssue =
          errStr.includes('mime') ||
          errStr.includes('format') ||
          errStr.includes('codec') ||
          errStr.includes('unsupported') ||
          errStr.includes('decode') ||
          errStr.includes('400');

        // Only retry WAV conversion if the failure is format-related
        if (isFormatIssue && (rawBlob || audioBlob)) {
          console.warn('Format issue detected, retrying with client WAV conversion...', firstErr);
          const blobToConvert = rawBlob || audioBlob!;
          const wavBlob = await convertBlobToWav(blobToConvert);
          const wavB64 = await blobToBase64(wavBlob);
          resultText = await transcribeAudioApi(wavB64, 'audio/wav', geminiApiKey);
          setAudioBase64(wavB64);
          setMimeType('audio/wav');
          b64 = wavB64;
          mime = 'audio/wav';
        } else {
          throw firstErr;
        }
      }

      setTranscript(resultText);
      setStatus('completed');

      onUpdateRef.current({
        ...blockRef.current,
        audioData: b64,
        audioMimeType: mime,
        durationSeconds: sessionDuration,
        transcriptOriginal: resultText,
        transcriptEdited: resultText,
        status: 'completed',
        time,
      });
    } catch (err: any) {
      console.error('Transcription error:', err);
      setStatus('error');
      setErrorMessage(
        err.message || 'Error en la transcripción con Gemini. El audio quedó grabado y podés escucharlo o transcribir de nuevo.'
      );
      // PRESERVE audioData, mime and duration even on error!
      onUpdateRef.current({
        ...blockRef.current,
        audioData: b64,
        audioMimeType: mime,
        durationSeconds: sessionDuration,
        status: 'error',
        errorMessage: err.message,
      });
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-app shadow-2xs space-y-4 transition hover:border-accent/40">
      {/* Block Header */}
      <div className="flex items-center justify-between gap-2 border-b border-app/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-main">
            Bloque de Voz
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted bg-surface-elevated px-2 py-0.5 rounded-md border border-app">
            <Clock className="w-3 h-3" />
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                onUpdate({ ...block, time: e.target.value });
              }}
              className="bg-transparent text-[11px] font-mono text-main focus:outline-hidden"
              aria-label="Hora del audio"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {status === 'transcribing' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-accent animate-pulse font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              Transcribiendo…
            </span>
          )}
          {status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Lista
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-500 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              Error
            </span>
          )}

          <button
            type="button"
            onClick={() => onDelete(block.id)}
            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
            title="Borrar bloque de voz"
            aria-label="Borrar bloque de voz"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Iframe Warning if inside preview */}
      {isIframe && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-2">
          <span>
            Si el navegador bloquea el micrófono dentro de la vista previa, abrila en una pestaña nueva.
          </span>
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface font-bold text-main border border-app hover:border-accent shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir app</span>
          </button>
        </div>
      )}

      {/* Recording Controls & States */}
      <div className="p-4 rounded-2xl bg-surface-elevated border border-app space-y-4">
        {recState === 'requesting_permission' && (
          <div className="flex items-center gap-3 py-3 text-xs font-mono text-accent animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Pidiendo permiso del micrófono al navegador…</span>
          </div>
        )}

        {recState === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono text-xs uppercase font-bold text-red-500">
                  Grabando en vivo ({mimeType})
                </span>
              </div>
              <span className="font-mono text-lg font-black text-main">
                {formatTimer(duration)}
              </span>
            </div>

            {/* Live Waveform */}
            <div className="flex items-center justify-center gap-1.5 h-12 py-1 bg-surface rounded-xl border border-app px-3">
              {waveformLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1.5 rounded-full bg-accent transition-all duration-75"
                  style={{ height: `${Math.max(12, lvl * 100)}%` }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 active:scale-95 transition min-h-[44px] cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar grabación</span>
            </button>
          </div>
        )}

        {recState === 'idle' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition min-h-[44px] cursor-pointer shadow-xs"
            >
              <Mic className="w-4 h-4" />
              <span>Iniciar grabación</span>
            </button>

            {/* Subir un audio desde archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.webm"
              onChange={handleUploadAudio}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated border border-app text-xs font-semibold text-main transition min-h-[44px] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-accent" />
              <span>Subir un audio (mp3, m4a, wav, webm)</span>
            </button>
          </div>
        )}

        {recState === 'stopped' && audioBase64 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted">
                Audio registrado ({formatTimer(duration)})
              </span>
              <button
                type="button"
                onClick={handleStartRecording}
                className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Grabar de nuevo</span>
              </button>
            </div>

            {/* Standard HTML5 Audio Element for playback */}
            <audio
              ref={audioPlayerRef}
              controls
              src={audioUrl || `data:${mimeType};base64,${audioBase64}`}
              className="w-full h-10 rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Error & Permission Help Guide Card */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 space-y-2.5">
          <div className="flex items-start gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
          </div>

          {helpGuideVisible && (
            <div className="pl-6 space-y-1.5 text-[11px] text-muted border-t border-red-500/20 pt-2">
              <p className="font-bold text-main">Cómo habilitar el micrófono:</p>
              <p>• <strong>iPhone / iPad:</strong> Ajustes &gt; Safari &gt; Micrófono &gt; Permitir.</p>
              <p>• <strong>Chrome / Mac / PC:</strong> Tocá el ícono de candado o controles a la izquierda de la barra de direcciones y activá "Micrófono".</p>
              <p>• <strong>Alternativa inmediata:</strong> Podés usar el botón "Subir un audio" para cargar un archivo grabado previamente.</p>
            </div>
          )}

          <div className="flex items-center gap-2 pl-6 pt-1">
            <button
              type="button"
              onClick={handleStartRecording}
              className="px-3 py-1.5 rounded-lg bg-surface border border-red-500/40 text-main font-bold hover:bg-surface-elevated cursor-pointer"
            >
              Reintentar grabación
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-contrast font-bold hover:opacity-90 cursor-pointer"
            >
              Subir un audio
            </button>
          </div>
        </div>
      )}

      {/* Transcribed Text Area */}
      <div className="space-y-2 pt-2 border-t border-app">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted">
            Transcripción de Audio por Gemini
          </span>
          {audioBase64 && (
            <button
              type="button"
              onClick={() => triggerTranscribe(audioBase64, mimeType)}
              disabled={status === 'transcribing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-subtle hover:bg-accent hover:text-accent-contrast text-accent text-xs font-semibold uppercase tracking-wider transition cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{status === 'error' ? 'Reintentar transcripción' : 'Transcribir de nuevo'}</span>
            </button>
          )}
        </div>

        <textarea
          rows={4}
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            onUpdate({
              ...block,
              transcriptEdited: e.target.value,
              time,
            });
          }}
          placeholder={
            status === 'transcribing'
              ? 'Transcribiendo audio en español rioplatense...'
              : 'La transcripción del audio aparecerá acá. Podés editarla o corregirla libremente.'
          }
          className="w-full p-3 rounded-xl border border-app bg-surface-elevated text-xs sm:text-sm text-main leading-relaxed focus:outline-hidden focus:border-accent resize-y"
        />
      </div>
    </div>
  );
};
