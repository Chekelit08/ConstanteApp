import { useState, useRef, useEffect, useCallback } from 'react';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseAudioRecorderReturn {
  state: RecorderState;
  duration: number; // in seconds
  audioBlob: Blob | null;
  audioUrl: string | null;
  audioBase64: string | null;
  mimeType: string;
  waveformLevels: number[]; // 0 to 1 values for live visualizer
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  resetRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(new Array(16).fill(0.1));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const cleanupAudioNodes = useCallback(() => {
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
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioNodes();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanupAudioNodes, audioUrl]);

  // Waveform animation loop
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Sample 16 frequency bands
    const bandsCount = 16;
    const step = Math.floor(dataArray.length / bandsCount);
    const levels: number[] = [];

    for (let i = 0; i < bandsCount; i++) {
      const val = dataArray[i * step] || 0;
      levels.push(Math.max(0.1, val / 255));
    }

    setWaveformLevels(levels);
    animFrameRef.current = requestAnimationFrame(updateWaveform);
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      cleanupAudioNodes();
      setAudioBlob(null);
      setAudioUrl(null);
      setAudioBase64(null);
      setDuration(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup audio analyzer for live waveform
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Pick supported mime type (prefer audio/mp4 on Safari/iOS, audio/webm on Chrome/Android)
      let selectedMime = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          selectedMime = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          selectedMime = 'audio/ogg;codecs=opus';
        } else {
          selectedMime = '';
        }
      }

      const mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        setAudioBlob(fullBlob);

        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64Data = res.split(',')[1] || '';
          setAudioBase64(base64Data);
        };
        reader.readAsDataURL(fullBlob);

        setState('stopped');
      };

      mediaRecorder.start(250); // collect chunk every 250ms
      setState('recording');

      // Start duration stopwatch
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start waveform loop
      updateWaveform();
    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('El micrófono fue bloqueado. Por favor permití el acceso al micrófono en el navegador para grabar tu bitácora.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No se detectó ningún micrófono conectado en este dispositivo.');
      } else {
        setError('No se pudo acceder al micrófono: ' + (err.message || 'Error desconocido'));
      }
      setState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      updateWaveform();
      setState('recording');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const cancelRecording = () => {
    cleanupAudioNodes();
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setDuration(0);
    audioChunksRef.current = [];
    setState('idle');
  };

  const resetRecording = () => {
    cleanupAudioNodes();
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setDuration(0);
    audioChunksRef.current = [];
    setState('idle');
  };

  return {
    state,
    duration,
    audioBlob,
    audioUrl,
    audioBase64,
    mimeType: mediaRecorderRef.current?.mimeType || 'audio/webm',
    waveformLevels,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
  };
}
