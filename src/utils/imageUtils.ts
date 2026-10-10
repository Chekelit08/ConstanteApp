/**
 * Image processing utilities for handwriting photos in CONSTANTE:
 * - Reads image files (including iOS HEIC/JPEG) via HTMLImageElement or createImageBitmap
 * - Resizes max dimension to 1600px
 * - Rotates canvas in 90-degree steps
 * - Enhances contrast (B&W document filter / grayscale contrast stretch for handwriting)
 */

export interface ImageProcessingOptions {
  rotationDegrees?: number; // 0, 90, 180, 270
  enhanceContrast?: boolean;
  cropPercent?: { top: number; right: number; bottom: number; left: number }; // 0 to 1
}

/**
 * Loads a File or Blob into an HTMLImageElement with HEIC detection
 */
export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

export function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const isHeic = file instanceof File && isHeicFile(file);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      if (isHeic) {
        reject(
          new Error(
            'El navegador no pudo decodificar este archivo HEIC de Apple. Podés tomar la foto con la cámara integrada o compartirla como JPG/PNG.'
          )
        );
      } else {
        reject(
          new Error(
            'No se pudo cargar la imagen seleccionada. Verificá que sea un archivo JPG, PNG o WEBP válido.'
          )
        );
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Loads an image from a data URL
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Error al cargar la vista previa.'));
    img.src = dataUrl;
  });
}

/**
 * Processes an image: rotation, max 1600px scale, and contrast enhancement
 */
export function processImageCanvas(
  img: HTMLImageElement,
  options: ImageProcessingOptions = {}
): string {
  const rotation = options.rotationDegrees || 0;
  const isRotated90or270 = rotation === 90 || rotation === 270;

  let origWidth = img.naturalWidth || img.width;
  let origHeight = img.naturalHeight || img.height;

  // Max dimension 1600px
  const maxDim = 1600;
  let scale = 1;
  const maxSide = Math.max(origWidth, origHeight);
  if (maxSide > maxDim) {
    scale = maxDim / maxSide;
  }

  const targetWidth = Math.round(origWidth * scale);
  const targetHeight = Math.round(origHeight * scale);

  const canvas = document.createElement('canvas');
  if (isRotated90or270) {
    canvas.width = targetHeight;
    canvas.height = targetWidth;
  } else {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo para procesar la imagen.');
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
  ctx.restore();

  // Contrast enhancement filter for handwriting
  if (options.enhanceContrast) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    // Grayscale + high contrast stretch
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Document enhancement curve: dark ink becomes darker, light paper becomes whiter
      let enhanced = gray;
      if (gray > 175) {
        enhanced = Math.min(255, gray * 1.25);
      } else if (gray < 110) {
        enhanced = Math.max(0, gray * 0.7);
      } else {
        // middle stretch
        enhanced = (gray - 110) * (255 / (175 - 110));
      }

      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Re-processes a photo from its pristine original data URL
 * Ensures rotation, contrast and edits are 100% reversible without degradation
 */
export async function reprocessPhotoFromOriginal(
  originalDataUrl: string,
  rotationDegrees = 0,
  enhanceContrast = false
): Promise<string> {
  const img = await loadImageFromDataUrl(originalDataUrl);
  return processImageCanvas(img, { rotationDegrees, enhanceContrast });
}
