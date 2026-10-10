import React, { useState, useRef, useEffect } from 'react';
import { JournalBlockPhoto, JournalPhotoItem } from '../../types/journal';
import { loadImageFromFile, processImageCanvas, reprocessPhotoFromOriginal } from '../../utils/imageUtils';
import { transcribeHandwritingApi } from '../../services/geminiClient';
import { saveMediaItem } from '../../services/mediaStorage';
import {
  Camera,
  Image as ImageIcon,
  RotateCw,
  Sparkles,
  Contrast,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ZoomIn,
  Undo2,
} from 'lucide-react';

interface PhotoJournalBlockEditorProps {
  block: JournalBlockPhoto;
  geminiApiKey?: string;
  onUpdate: (updatedBlock: JournalBlockPhoto) => void;
  onDelete: (blockId: string) => void;
}

export const PhotoJournalBlockEditor: React.FC<PhotoJournalBlockEditorProps> = ({
  block,
  geminiApiKey,
  onUpdate,
  onDelete,
}) => {
  const [time, setTime] = useState<string>(block.time || '12:00');
  const [photos, setPhotos] = useState<JournalPhotoItem[]>(block.photos || []);
  const [transcript, setTranscript] = useState<string>(
    block.transcriptEdited || block.transcriptOriginal || ''
  );
  const [status, setStatus] = useState<'idle' | 'transcribing' | 'completed' | 'error'>(
    block.status || 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(block.errorMessage || null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [isProcessingLocal, setIsProcessingLocal] = useState<boolean>(false);

  const blockRef = useRef(block);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    blockRef.current = block;
    onUpdateRef.current = onUpdate;
  }, [block, onUpdate]);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Handle incoming files
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingLocal(true);
    setErrorMessage(null);

    try {
      const remainingSlots = Math.max(0, 5 - photos.length);
      const toProcess = Array.from(files).slice(0, remainingSlots);

      const newPhotos: JournalPhotoItem[] = [];

      for (const file of toProcess) {
        // Load file into canvas image (supports iPhone HEIC/JPEG)
        const img = await loadImageFromFile(file);
        // Process to max 1600px JPEG
        const dataUrl = processImageCanvas(img, { rotationDegrees: 0, enhanceContrast: false });
        const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Save original in IndexedDB to avoid filling localStorage quota
        await saveMediaItem(photoId, dataUrl, 'image/jpeg').catch(() => {});

        newPhotos.push({
          id: photoId,
          dataUrl,
          originalDataUrl: dataUrl,
          rotation: 0,
          contrastEnhanced: false,
        });
      }

      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);

      const updatedBlock: JournalBlockPhoto = {
        ...blockRef.current,
        photos: updatedPhotos,
        time,
      };
      onUpdateRef.current(updatedBlock);

      // Auto trigger transcription if empty transcript
      if (!transcript.trim() && updatedPhotos.length > 0) {
        handleTranscribe(updatedPhotos);
      }
    } catch (err: any) {
      console.error('Error processing photos:', err);
      setErrorMessage(err.message || 'Error al procesar la imagen seleccionada.');
    } finally {
      setIsProcessingLocal(false);
    }
  };

  // Rotate a specific photo by 90 degrees (reversible)
  const handleRotatePhoto = async (index: number) => {
    const target = photos[index];
    if (!target) return;
    try {
      const orig = target.originalDataUrl || target.dataUrl;
      const nextRotation = ((target.rotation || 0) + 90) % 360;
      const reprocessed = await reprocessPhotoFromOriginal(
        orig,
        nextRotation,
        Boolean(target.contrastEnhanced)
      );

      const updatedPhotos = [...photos];
      updatedPhotos[index] = {
        ...target,
        dataUrl: reprocessed,
        rotation: nextRotation,
      };
      setPhotos(updatedPhotos);
      onUpdateRef.current({ ...blockRef.current, photos: updatedPhotos });
    } catch (e) {
      console.warn('Error rotating photo:', e);
    }
  };

  // Enhance contrast (B&W document scanner mode, reversible)
  const handleEnhanceContrast = async (index: number) => {
    const target = photos[index];
    if (!target) return;
    try {
      const orig = target.originalDataUrl || target.dataUrl;
      const nextContrast = !target.contrastEnhanced;
      const reprocessed = await reprocessPhotoFromOriginal(
        orig,
        target.rotation || 0,
        nextContrast
      );

      const updatedPhotos = [...photos];
      updatedPhotos[index] = {
        ...target,
        dataUrl: reprocessed,
        contrastEnhanced: nextContrast,
      };
      setPhotos(updatedPhotos);
      onUpdateRef.current({ ...blockRef.current, photos: updatedPhotos });
    } catch (e) {
      console.warn('Error enhancing photo contrast:', e);
    }
  };

  // Revert photo to pristine original
  const handleRevertPhoto = async (index: number) => {
    const target = photos[index];
    if (!target || !target.originalDataUrl) return;
    const updatedPhotos = [...photos];
    updatedPhotos[index] = {
      ...target,
      dataUrl: target.originalDataUrl,
      rotation: 0,
      contrastEnhanced: false,
    };
    setPhotos(updatedPhotos);
    onUpdateRef.current({ ...blockRef.current, photos: updatedPhotos });
  };

  // Remove a photo
  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (selectedPhotoIndex >= updated.length) {
      setSelectedPhotoIndex(Math.max(0, updated.length - 1));
    }
    onUpdateRef.current({ ...blockRef.current, photos: updated });
  };

  // Transcribe with Gemini vision
  const handleTranscribe = async (photosToUse = photos) => {
    if (photosToUse.length === 0) return;
    setStatus('transcribing');
    setErrorMessage(null);

    try {
      const imagesDataUrls = photosToUse.map((p) => p.dataUrl);
      const text = await transcribeHandwritingApi(imagesDataUrls, geminiApiKey);

      setTranscript(text);
      setStatus('completed');

      onUpdateRef.current({
        ...blockRef.current,
        photos: photosToUse,
        transcriptOriginal: text,
        transcriptEdited: text,
        status: 'completed',
        time,
      });
    } catch (err: any) {
      console.error('Error transcribing handwriting:', err);
      setStatus('error');
      setErrorMessage(
        err.message || 'Error al transcribir el texto manuscrito. Verificá tu conexión o clave de API.'
      );
      // Note: we update ONLY status and errorMessage on blockRef.current, preserving photos and concurrent edits
      onUpdateRef.current({
        ...blockRef.current,
        status: 'error',
        errorMessage: err.message,
      });
    }
  };

  const handleTranscriptChange = (newText: string) => {
    setTranscript(newText);
    onUpdate({
      ...block,
      transcriptEdited: newText,
      time,
    });
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-app shadow-2xs space-y-4 transition hover:border-accent/40">
      {/* Block Header */}
      <div className="flex items-center justify-between gap-2 border-b border-app/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-subtle text-accent flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-main">
            Foto de Escritura a Mano
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
              aria-label="Hora de la foto"
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
            title="Borrar bloque de foto"
            aria-label="Borrar bloque de foto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Photo Capture Buttons (if fewer than 5 photos) */}
      {photos.length < 5 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessingLocal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition min-h-[44px] cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Sacar foto con cámara</span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isProcessingLocal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-app text-xs font-semibold text-main transition min-h-[44px] cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-accent" />
            <span>Elegir de galería</span>
          </button>

          <span className="text-[11px] font-mono text-muted ml-auto">
            {photos.length}/5 páginas
          </span>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessingLocal && (
        <div className="flex items-center gap-2 text-xs font-mono text-muted p-2 rounded-lg bg-surface-elevated animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          <span>Optimizando foto en el navegador (formato JPEG, máx. 1600px)...</span>
        </div>
      )}

      {/* Photos Carousel & Tool Bar */}
      {photos.length > 0 && (
        <div className="space-y-3">
          {/* Main Photo Preview with Controls */}
          <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-app max-h-96 flex items-center justify-center group">
            <img
              src={photos[selectedPhotoIndex]?.dataUrl}
              alt={`Página manuscrita ${selectedPhotoIndex + 1}`}
              className="max-h-96 w-auto object-contain select-none"
            />

            {/* Quick Action Overlay on photo */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs p-1.5 rounded-xl border border-white/20">
              {(photos[selectedPhotoIndex]?.rotation || photos[selectedPhotoIndex]?.contrastEnhanced) ? (
                <button
                  type="button"
                  onClick={() => handleRevertPhoto(selectedPhotoIndex)}
                  className="p-1.5 text-white hover:text-amber-400 rounded-lg transition cursor-pointer"
                  title="Restablecer foto original (deshacer rotación y filtros)"
                  aria-label="Restablecer foto original"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleRotatePhoto(selectedPhotoIndex)}
                className="p-1.5 text-white hover:text-accent rounded-lg transition cursor-pointer"
                title="Rotar 90° a la derecha"
                aria-label="Rotar foto 90 grados"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleEnhanceContrast(selectedPhotoIndex)}
                className="p-1.5 text-white hover:text-accent rounded-lg transition cursor-pointer"
                title="Mejorar contraste para escritura a mano (B/N de alto contraste)"
                aria-label="Mejorar contraste de tinta"
              >
                <Contrast className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleRemovePhoto(selectedPhotoIndex)}
                className="p-1.5 text-white hover:text-red-400 rounded-lg transition cursor-pointer"
                title="Eliminar esta foto"
                aria-label="Eliminar foto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-lg text-white font-mono text-[10px]">
              Página {selectedPhotoIndex + 1} de {photos.length}
            </div>
          </div>

          {/* Thumbnails if multiple pages */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                    selectedPhotoIndex === idx
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-app opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={p.dataUrl} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transcription Area: Original Photo side-by-side or stacked with Editable Transcript */}
      <div className="space-y-2 pt-2 border-t border-app">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted">
            Texto Manuscrito Transcripto por Gemini
          </span>
          <button
            type="button"
            onClick={() => handleTranscribe()}
            disabled={status === 'transcribing' || photos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-subtle hover:bg-accent hover:text-accent-contrast text-accent text-xs font-semibold uppercase tracking-wider transition cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{status === 'error' ? 'Reintentar transcripción' : 'Transcribir con IA'}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => handleTranscribe()}
                className="underline font-bold"
              >
                Tocar para reintentar
              </button>
            </div>
          </div>
        )}

        <textarea
          rows={5}
          value={transcript}
          onChange={(e) => handleTranscriptChange(e.target.value)}
          placeholder={
            status === 'transcribing'
              ? 'Transcribiendo el texto manuscrito con visión multimodal de Gemini...'
              : 'El texto transcripto aparecerá acá. Podés corregirlo o editarlo libremente.'
          }
          className="w-full p-3 rounded-xl border border-app bg-surface-elevated text-xs sm:text-sm text-main leading-relaxed focus:outline-hidden focus:border-accent resize-y"
        />

        <p className="text-[11px] text-muted italic">
          La foto original se conserva siempre guardada junto con la transcripción editable.
        </p>
      </div>
    </div>
  );
};
