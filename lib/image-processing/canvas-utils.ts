import { ImageAdjustments, CropState } from '@/lib/store';
import { getImageWorker } from './worker-loader';

export async function processImage(
  imageSrc: string,
  adjustments: ImageAdjustments,
  crop: CropState
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        // Use requestAnimationFrame to yield control before heavy operations
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 1. Setup Canvas for Geometric Transformations (Crop/Rotate)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', {
          willReadFrequently: true, // Optimize for frequent read operations
          desynchronized: true, // Allow async operations
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high' // Use high-quality image smoothing
        }) as CanvasRenderingContext2D | null;

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Determine if we have a valid crop
        const hasCrop = crop.width > 0 && crop.height > 0;

        // If crop width/height are 0 (initial state), use full image
        const width = hasCrop ? crop.width : img.naturalWidth;
        const height = hasCrop ? crop.height : img.naturalHeight;

        // Set canvas size to the target output size
        canvas.width = width;
        canvas.height = height;

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, width, height);

        // Calculate source coordinates
        const sx = hasCrop ? crop.x : 0;
        const sy = hasCrop ? crop.y : 0;
        const sWidth = hasCrop ? crop.width : img.naturalWidth;
        const sHeight = hasCrop ? crop.height : img.naturalHeight;

        // Handle rotation: if there's rotation, we need to rotate the cropped area
        if (crop.rotation !== 0) {
          // Save context for rotation
          ctx.save();

          // Move to center of canvas
          ctx.translate(width / 2, height / 2);

          // Rotate
          ctx.rotate((crop.rotation * Math.PI) / 180);

          // Draw the cropped image centered
          ctx.drawImage(
            img,
            sx, sy, sWidth, sHeight, // Source
            -width / 2, -height / 2, width, height // Destination (centered)
          );

          // Restore context
          ctx.restore();
        } else {
          // No rotation, draw directly
          ctx.drawImage(
            img,
            sx, sy, sWidth, sHeight, // Source
            0, 0, width, height // Destination
          );
        }

        // Yield again before getImageData (which can be expensive)
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 2. Get Pixel Data
        const imageData = ctx.getImageData(0, 0, width, height);

        // 3. Process image adjustments in Web Worker (non-blocking)
        const processedImageData = await processImageInWorker(imageData, adjustments);

        // Yield before putImageData
        await new Promise(resolve => requestAnimationFrame(resolve));

        // 4. Put processed data back
        ctx.putImageData(processedImageData, 0, 0);

        // 5. Export (use requestAnimationFrame to avoid blocking)
        await new Promise(resolve => requestAnimationFrame(resolve));
        resolve(canvas.toDataURL('image/png'));

      } catch (error) {
        reject(error);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}

/**
 * Process image data in Web Worker (runs in separate thread)
 */
async function processImageInWorker(
  imageData: ImageData,
  adjustments: ImageAdjustments
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const worker = getImageWorker();

    // Handle worker response
    const handleMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      if (e.data.success) {
        // Reconstruct ImageData from worker response
        const processedData = new Uint8ClampedArray(e.data.imageData.data);
        const processedImageData = new ImageData(
          processedData,
          e.data.imageData.width,
          e.data.imageData.height
        );
        resolve(processedImageData);
      } else {
        reject(new Error(e.data.error || 'Worker processing failed'));
      }
    };

    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Clone the buffer before transferring (original will be detached after transfer)
    const buffer = imageData.data.buffer.slice(0);

    // Send image data to worker
    // Transfer the ArrayBuffer for zero-copy transfer (faster)
    worker.postMessage(
      {
        imageData: {
          data: buffer,
          width: imageData.width,
          height: imageData.height
        },
        adjustments
      },
      [buffer] // Transfer ownership for performance
    );
  });
}
