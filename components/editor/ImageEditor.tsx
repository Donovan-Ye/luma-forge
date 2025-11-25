'use client';

import { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/lib/store';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { CropTool } from './CropTool';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RotateCcw,
  Download,
  Undo,
  Redo,
  Loader2,
  Crop as CropIcon,
  Image as ImageIcon,
  Maximize2,
  Minus,
  Plus,
  Eye
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { processImage } from '@/lib/image-processing/canvas-utils';

export function ImageEditor() {
  const {
    originalImage,
    previewImage,
    processedImage,
    adjustments,
    crop,
    undo,
    redo,
    reset,
    history,
    historyIndex,
    setPreviewImage,
    setImage
  } = useEditorStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Determine if undo/redo should be enabled
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Handle global mouse/touch/keyboard events for show original button
  useEffect(() => {
    const handleMouseUp = () => {
      if (showOriginal) setShowOriginal(false);
    };
    const handleTouchEnd = () => {
      if (showOriginal) setShowOriginal(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('e.code', e.code)
      // Only trigger if spacebar is pressed and user is not typing in an input/textarea
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowOriginal(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setShowOriginal(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showOriginal]);

  // Handle scroll zoom with native event listener
  useEffect(() => {
    if (isCropping || !processedImage) return;

    const handleWheel = (e: WheelEvent) => {
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;

      // Check if the event is within the canvas area
      const rect = canvasElement.getBoundingClientRect();
      const isInsideCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInsideCanvas) return;

      e.preventDefault();
      e.stopPropagation();

      // Use ctrl/cmd key for more precise zoom control
      const isPreciseZoom = e.ctrlKey || e.metaKey;
      const zoomFactor = isPreciseZoom ? 1.05 : 1.15;

      // deltaY > 0 means scrolling down (zoom out), deltaY < 0 means scrolling up (zoom in)
      const isZoomIn = e.deltaY < 0;

      setZoomLevel((prevZoom) => {
        const newZoom = isZoomIn
          ? prevZoom * zoomFactor
          : prevZoom / zoomFactor;

        // Clamp between 0.1x and 5x
        return Math.max(0.1, Math.min(5, newZoom));
      });
    };

    // Attach to window to catch all wheel events, then filter by position
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isCropping, processedImage]);

  // Generate low-res preview when original image changes
  useEffect(() => {
    if (!originalImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1000; // Reasonable size for preview
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.8)); // Faster JPEG
    };
    img.src = originalImage;
  }, [originalImage, setPreviewImage]);

  // Handle image processing when adjustments/crop change
  // Uses previewImage for performance
  useEffect(() => {
    if (!previewImage) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const result = await processImage(previewImage, adjustments, crop);
        if (active) {
          useEditorStore.setState({ processedImage: result });
        }
      } catch (error) {
        console.error("Failed to process image", error);
      } finally {
        if (active) setIsProcessing(false);
      }
    }, 30); // Faster debounce for preview

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [previewImage, adjustments, crop]);

  const handleExport = async () => {
    if (!originalImage) return;

    setIsExporting(true);
    try {
      // Process the FULL resolution image on export
      const fullResResult = await processImage(originalImage, adjustments, crop);

      const link = document.createElement('a');
      link.download = `luma-edit-${Date.now()}.png`;
      link.href = fullResResult;
      link.click();
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export image");
    } finally {
      setIsExporting(false);
    }
  };

  if (!originalImage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Luma Forge</h1>
            <p className="text-lg text-muted-foreground">
              Professional grade online image editor.
            </p>
          </div>
          <ImageUpload />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-foreground overflow-hidden">

      {/* Top Header / Toolbar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-zinc-100">Luma Forge</span>
          <Separator orientation="vertical" className="h-6 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={reset}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <div className="relative group">
              <Button
                variant="ghost"
                size="icon"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowOriginal(true);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setShowOriginal(true);
                }}
                className={`text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ${showOriginal ? 'bg-zinc-800 text-zinc-100' : ''}`}
                title="Hold to view original image (or press Space)"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-zinc-300 bg-zinc-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Hold to view original
                <span className="ml-1.5 text-zinc-500">(Space)</span>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !processedImage}
            className="bg-zinc-100 text-zinc-900 hover:bg-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Crop Overlay */}
        {isCropping && (
          <div className="absolute inset-0 z-40">
            <CropTool onClose={() => setIsCropping(false)} />
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 bg-zinc-950 relative flex flex-col">
          {/* Canvas Viewport */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center p-8"
          >
            {showOriginal && originalImage ? (
              <img
                src={originalImage}
                alt="Original"
                className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: zoomLevel === 1 ? 'transform 0.2s' : 'none',
                  transformOrigin: 'center center'
                }}
                draggable={false}
              />
            ) : processedImage ? (
              <img
                src={processedImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800 select-none"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: zoomLevel === 1 ? 'transform 0.2s' : 'none',
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
                onClick={() => setZoomLevel(1)}
                disabled={zoomLevel === 1}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Adjustments */}
        <div className="w-[320px] border-l border-zinc-800 bg-background flex flex-col shrink-0 z-30 shadow-xl">
          <div className="p-4 border-b border-zinc-800">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => setIsCropping(true)}
            >
              <CropIcon className="w-4 h-4 mr-2" />
              Crop & Rotate
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <AdjustmentsPanel />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
