'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize2, Minus, Plus } from 'lucide-react';

interface CanvasViewportProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  showOriginal: boolean;
  originalImage: string | null;
  processedImage: string | null;
  zoomLevel: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  setZoomLevel: (level: number | ((prev: number) => number)) => void;
  setPanX: (x: number) => void;
  setPanY: (y: number) => void;
}

export function CanvasViewport({
  canvasRef,
  imageRef,
  showOriginal,
  originalImage,
  processedImage,
  zoomLevel,
  panX,
  panY,
  isDragging,
  setZoomLevel,
  setPanX,
  setPanY,
}: CanvasViewportProps) {
  const [originalImageLoaded, setOriginalImageLoaded] = useState(false);
  const currentImageSrcRef = useRef<string | null>(null);
  const preloadImageRef = useRef<HTMLImageElement | null>(null);

  // Reset loaded state when image changes (separate effect to avoid lint issues)
  useEffect(() => {
    if (!showOriginal || !originalImage) {
      return;
    }
    if (currentImageSrcRef.current !== originalImage && currentImageSrcRef.current !== null) {
      // Image changed, reset loaded state using startTransition to avoid synchronous setState
      startTransition(() => {
        setOriginalImageLoaded(false);
      });
    }
  }, [showOriginal, originalImage]);

  // Preload original image when showOriginal becomes true to prevent flash
  useEffect(() => {
    // Clean up any existing preload
    const previousImg = preloadImageRef.current;
    if (previousImg) {
      previousImg.onload = null;
      previousImg.onerror = null;
    }

    if (!showOriginal || !originalImage) {
      preloadImageRef.current = null;
      currentImageSrcRef.current = null;
      return;
    }

    // If already loaded with the same src, keep it loaded
    if (currentImageSrcRef.current === originalImage && originalImageLoaded) {
      return;
    }

    // Track current image
    const currentSrc = originalImage;
    currentImageSrcRef.current = currentSrc;

    // Create a new image element for preloading
    const img = new Image();
    preloadImageRef.current = img;

    const handleLoad = async () => {
      // Only update if this is still the current image being loaded
      if (preloadImageRef.current === img && currentImageSrcRef.current === currentSrc) {
        try {
          // Decode the image to ensure it's fully ready for display
          if (img.decode) {
            await img.decode();
          }
          setOriginalImageLoaded(true);
        } catch {
          // If decode fails, still mark as loaded
          setOriginalImageLoaded(true);
        }
      }
    };

    const handleError = () => {
      if (preloadImageRef.current === img && currentImageSrcRef.current === currentSrc) {
        setOriginalImageLoaded(false);
      }
    };

    img.onload = handleLoad;
    img.onerror = handleError;

    // Set the src to start loading (or use cached version)
    img.src = originalImage;

    // Check if image is already cached/loaded immediately after setting src
    // This handles the case where the browser has the image cached
    if (img.complete && img.naturalWidth > 0) {
      // Image is already loaded (cached), trigger load handler immediately
      handleLoad();
    }

    // Cleanup function
    return () => {
      if (preloadImageRef.current === img) {
        img.onload = null;
        img.onerror = null;
      }
    };
  }, [showOriginal, originalImage, originalImageLoaded]);

  return (
    <>
      {/* Canvas Viewport */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-8 ${isDragging ? 'cursor-grabbing' : zoomLevel > 1 ? 'cursor-grab' : ''}`}
      >
        {showOriginal && originalImage ? (
          originalImageLoaded ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imageRef}
              src={originalImage}
              alt="Original"
              className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none transition-opacity duration-200"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                transition: zoomLevel === 1 && !isDragging ? 'transform 0.2s' : 'none',
                transformOrigin: 'center center',
                // Use will-change for better performance
                willChange: 'transform'
              }}
              draggable={false}
            />
          ) : (
            // Show loading or fallback to processed image while original loads
            processedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={processedImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none opacity-50"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                  transition: zoomLevel === 1 && !isDragging ? 'transform 0.2s' : 'none',
                  transformOrigin: 'center center'
                }}
                draggable={false}
              />
            ) : (
              <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
            )
          )
        ) : processedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={processedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transition: zoomLevel === 1 && !isDragging ? 'transform 0.2s' : 'none',
              transformOrigin: 'center center'
            }}
            draggable={false}
          />
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
        )}
      </div>

      {/* Canvas Bottom Bar (Zoom etc) */}
      <div className="h-10 border-t border-zinc-900 bg-zinc-950/50 flex items-center justify-between px-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span>{Math.round(zoomLevel * 100)}%</span>
          <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-none"
              onClick={() => setZoomLevel(Math.max(0.1, zoomLevel / 1.1))}
              disabled={zoomLevel <= 0.1}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-none"
              onClick={() => setZoomLevel(Math.min(5, zoomLevel * 1.1))}
              disabled={zoomLevel >= 5}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              setZoomLevel(1);
              setPanX(0);
              setPanY(0);
            }}
            disabled={zoomLevel === 1}
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </>
  );
}

