import { useEffect, useRef } from 'react';
import { useEditorStore, usePreviewImage, useAdjustments, useCrop } from '@/lib/store';
import { processImage } from '@/lib/image-processing/canvas-utils';

export function useImageProcessing() {
  const previewImage = usePreviewImage();
  const adjustments = useAdjustments();
  const crop = useCrop();
  const setPreviewImage = useEditorStore((state) => state.setPreviewImage);
  const setProcessedImage = useEditorStore((state) => state.setProcessedImage);
  const originalImage = useEditorStore((state) => {
    if (!state.currentImageId) return null;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.originalImage || null;
  });
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // Preload and decode original image for fast "show original" display
  useEffect(() => {
    if (!originalImage) {
      originalImageRef.current = null;
      return;
    }

    // Preload the original image in the background using requestIdleCallback
    // to avoid blocking the main thread
    const preloadImage = () => {
      const img = new Image();

      img.onload = async () => {
        try {
          // Use decode() API if available for better performance
          if (img.decode) {
            await img.decode();
          }

          // Force image decoding by drawing to offscreen canvas
          // This ensures the image is fully decoded and ready for instant display
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            // Force decode by reading pixel data (small operation)
            ctx.getImageData(0, 0, 1, 1);
          }

          originalImageRef.current = img;
        } catch {
          // If decode fails, still cache the image
          originalImageRef.current = img;
        }
      };

      img.onerror = () => {
        originalImageRef.current = null;
      };

      img.src = originalImage;
    };

    // Use requestIdleCallback to preload when browser is idle
    // Fallback to setTimeout if not available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(preloadImage, { timeout: 2000 });
    } else {
      setTimeout(preloadImage, 100);
    }
  }, [originalImage]);

  // Generate high-quality preview when original image changes
  // Only generate if preview doesn't already exist (to preserve persisted preview)
  useEffect(() => {
    if (!originalImage) return;
    // If previewImage already exists, don't regenerate it (it might be from persistence)
    if (previewImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // This balances quality and performance
      const MAX_SIZE = 1536;
      let width = img.width;
      let height = img.height;

      // Only resize if image is larger than MAX_SIZE
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', {
        // Use high-quality rendering settings
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      }) as CanvasRenderingContext2D | null;
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Use high-quality JPEG (0.95) for good quality while keeping file size reasonable
        // This is much better than the previous 0.8 quality
        setPreviewImage(canvas.toDataURL('image/jpeg', 0.95));
      }
    };
    img.src = originalImage;
  }, [originalImage, previewImage, setPreviewImage]);

  // Handle image processing when adjustments/crop change
  // Uses previewImage for performance
  useEffect(() => {
    if (!previewImage) return;

    let active = true;
    let rafId: number | null = null;

    // Use requestAnimationFrame for smoother updates
    const scheduleUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(async () => {
        try {
          const result = await processImage(previewImage, adjustments, crop);
          if (active) {
            // Use requestAnimationFrame to update state smoothly
            requestAnimationFrame(() => {
              if (active) {
                setProcessedImage(result);
              }
            });
          }
        } catch (error) {
          console.error("Failed to process image", error);
        }
      });
    };

    // Small debounce to batch rapid changes
    const timer = setTimeout(scheduleUpdate, 16); // ~1 frame at 60fps

    return () => {
      active = false;
      clearTimeout(timer);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [previewImage, adjustments, crop, setProcessedImage]);

  return { originalImageRef };
}

