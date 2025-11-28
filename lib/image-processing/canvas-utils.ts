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
        const hasRotation = crop.rotation !== 0 && crop.rotation % 360 !== 0;

        // react-image-crop provides PixelCrop coordinates
        // These coordinates are in the natural image space (naturalWidth/naturalHeight)
        // So we can use them directly

        let width = hasCrop ? crop.width : img.naturalWidth;
        let height = hasCrop ? crop.height : img.naturalHeight;

        // Step 1: Handle rotation first (if needed)
        // When rotation is present, we rotate the image first, then crop
        if (hasRotation && hasCrop) {
          const rad = (crop.rotation * Math.PI) / 180;
          const cos = Math.abs(Math.cos(rad));
          const sin = Math.abs(Math.sin(rad));

          // Calculate rotated image dimensions
          const rotatedWidth = img.naturalWidth * cos + img.naturalHeight * sin;
          const rotatedHeight = img.naturalWidth * sin + img.naturalHeight * cos;

          // Create rotated image canvas
          const rotatedCanvas = document.createElement('canvas');
          const rotatedCtx = rotatedCanvas.getContext('2d', {
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
          }) as CanvasRenderingContext2D;

          rotatedCanvas.width = rotatedWidth;
          rotatedCanvas.height = rotatedHeight;

          // Rotate the full image
          rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
          rotatedCtx.rotate(rad);
          rotatedCtx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
          rotatedCtx.drawImage(img, 0, 0);

          // Transform crop coordinates from original to rotated space
          const imgCenterX = img.naturalWidth / 2;
          const imgCenterY = img.naturalHeight / 2;

          const transformPoint = (x: number, y: number) => {
            const dx = x - imgCenterX;
            const dy = y - imgCenterY;
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
            return {
              x: rx + rotatedWidth / 2,
              y: ry + rotatedHeight / 2
            };
          };

          // Transform crop rectangle corners
          const corners = [
            transformPoint(crop.x, crop.y),
            transformPoint(crop.x + crop.width, crop.y),
            transformPoint(crop.x, crop.y + crop.height),
            transformPoint(crop.x + crop.width, crop.y + crop.height),
          ];

          // Find bounding box in rotated space
          const minX = Math.max(0, Math.min(...corners.map(c => c.x)));
          const maxX = Math.min(rotatedWidth, Math.max(...corners.map(c => c.x)));
          const minY = Math.max(0, Math.min(...corners.map(c => c.y)));
          const maxY = Math.min(rotatedHeight, Math.max(...corners.map(c => c.y)));

          // Update crop coordinates for rotated image
          const rotatedCropX = minX;
          const rotatedCropY = minY;
          const rotatedCropWidth = maxX - minX;
          const rotatedCropHeight = maxY - minY;

          // Set canvas size to crop dimensions
          canvas.width = crop.width;
          canvas.height = crop.height;

          // Draw cropped area and rotate back
          ctx.save();
          ctx.translate(crop.width / 2, crop.height / 2);
          ctx.rotate(-rad);
          ctx.translate(-crop.width / 2, -crop.height / 2);
          ctx.drawImage(
            rotatedCanvas,
            rotatedCropX, rotatedCropY, rotatedCropWidth, rotatedCropHeight,
            0, 0, crop.width, crop.height
          );
          ctx.restore();

          width = crop.width;
          height = crop.height;
        } else if (hasRotation) {
          // Only rotation, no crop
          const rad = (crop.rotation * Math.PI) / 180;
          const cos = Math.abs(Math.cos(rad));
          const sin = Math.abs(Math.sin(rad));
          const rotatedWidth = img.naturalWidth * cos + img.naturalHeight * sin;
          const rotatedHeight = img.naturalWidth * sin + img.naturalHeight * cos;

          canvas.width = rotatedWidth;
          canvas.height = rotatedHeight;
          ctx.clearRect(0, 0, rotatedWidth, rotatedHeight);
          ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
          ctx.rotate(rad);
          ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
          ctx.drawImage(img, 0, 0);

          // Get image data from this canvas for further processing
          const imageData = ctx.getImageData(0, 0, rotatedWidth, rotatedHeight);
          const processedImageData = await processImageInWorker(imageData, adjustments);
          ctx.putImageData(processedImageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        } else if (hasCrop) {
          // Simple crop without rotation
          canvas.width = crop.width;
          canvas.height = crop.height;
          ctx.clearRect(0, 0, crop.width, crop.height);
          ctx.drawImage(
            img,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, crop.width, crop.height
          );
          width = crop.width;
          height = crop.height;
        } else {
          // No crop, no rotation - use full image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, 0, 0);
          width = img.naturalWidth;
          height = img.naturalHeight;
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
