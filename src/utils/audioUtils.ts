/**
 * Audio Utilities for CONSTANTE:
 * - Browser / iPhone MediaRecorder mimeType negotiation
 * - Client-side audio to standard 16-bit WAV converter (Web Audio API)
 * - Microphone permission diagnostics and iframe detection
 */

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }

  return 'audio/webm';
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    let index = 0;
    for (let i = 0; i < left.length; i++) {
      result[index++] = left[i];
      result[index++] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = result.length * bytesPerSample;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataSize, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Converts any browser audio Blob to standard WAV
 */
export async function convertBlobToWav(audioBlob: Blob): Promise<Blob> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API no está disponible en este navegador.');
  }

  const audioCtx = new AudioCtx();
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBufferToWav(audioBuffer);
  } finally {
    if (audioCtx.state !== 'closed') {
      await audioCtx.close();
    }
  }
}

/**
 * Encodes a Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Inspects microphone permission status and environment
 */
export async function checkMicrophonePermission(): Promise<{
  state: 'granted' | 'denied' | 'prompt' | 'unsupported';
  isIframe: boolean;
  isSecure: boolean;
}> {
  const isIframe = window.self !== window.top;
  const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  if (!navigator.permissions || !navigator.permissions.query) {
    return { state: 'unsupported', isIframe, isSecure };
  }

  try {
    const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return {
      state: res.state as 'granted' | 'denied' | 'prompt',
      isIframe,
      isSecure,
    };
  } catch {
    return { state: 'unsupported', isIframe, isSecure };
  }
}

/**
 * Gets exact duration in seconds from an audio Blob/File using loadedmetadata
 */
export function getAudioDuration(fileOrBlob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fileOrBlob);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(url);
      resolve(isFinite(dur) && dur > 0 ? Math.round(dur) : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}
