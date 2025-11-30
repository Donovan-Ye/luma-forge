'use client';

import { useRef } from 'react';
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
  return (
    <>
      {/* Canvas Viewport */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-8 ${isDragging ? 'cursor-grabbing' : zoomLevel > 1 ? 'cursor-grab' : ''}`}
      >
        {showOriginal && originalImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={originalImage}
            alt="Original"
            className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transition: zoomLevel === 1 && !isDragging ? 'transform 0.2s' : 'none',
              transformOrigin: 'center center',
              // Use will-change for better performance
              willChange: 'transform'
            }}
            draggable={false}
            loading="eager"
            decoding="async"
          />
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

