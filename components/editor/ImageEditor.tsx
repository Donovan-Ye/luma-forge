'use client';

import { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/lib/store';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { CropTool } from './CropTool';
import { Histogram } from './Histogram';
import { ImageMetadata } from './ImageMetadata';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    isLoading,
    setPreviewImage,
    setImage,
    clearAll
  } = useEditorStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  // Reset pan when zoom resets to 1x
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanX(0);
      setPanY(0);
    }
  }, [zoomLevel]);

  // Handle drag and pan
  useEffect(() => {
    if (isCropping || !processedImage || zoomLevel === 1) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only start dragging if clicking on the image or canvas area
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target === canvasRef.current) {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX,
          panY
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !canvasRef.current || !imageRef.current) return;
      e.preventDefault();

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newPanX = dragStartRef.current.panX + deltaX;
      const newPanY = dragStartRef.current.panY + deltaY;

      // Calculate bounds based on image and canvas dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate the scaled image dimensions
      const scaledWidth = imgRect.width / zoomLevel;
      const scaledHeight = imgRect.height / zoomLevel;
      const scaledImageWidth = scaledWidth * zoomLevel;
      const scaledImageHeight = scaledHeight * zoomLevel;

      // Calculate max pan bounds (allow some overflow for better UX)
      const maxPanX = Math.max(0, (scaledImageWidth - canvasRect.width) / 2);
      const maxPanY = Math.max(0, (scaledImageHeight - canvasRect.height) / 2);

      // Constrain pan values
      const constrainedPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
      const constrainedPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

      setPanX(constrainedPanX);
      setPanY(constrainedPanY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target === canvasRef.current) {
        if (e.touches.length === 1) {
          e.preventDefault();
          setIsDragging(true);
          dragStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            panX,
            panY
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !dragStartRef.current || e.touches.length !== 1 || !canvasRef.current || !imageRef.current) return;
      e.preventDefault();

      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;

      const newPanX = dragStartRef.current.panX + deltaX;
      const newPanY = dragStartRef.current.panY + deltaY;

      // Calculate bounds based on image and canvas dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate the scaled image dimensions
      const scaledWidth = imgRect.width / zoomLevel;
      const scaledHeight = imgRect.height / zoomLevel;
      const scaledImageWidth = scaledWidth * zoomLevel;
      const scaledImageHeight = scaledHeight * zoomLevel;

      // Calculate max pan bounds (allow some overflow for better UX)
      const maxPanX = Math.max(0, (scaledImageWidth - canvasRect.width) / 2);
      const maxPanY = Math.max(0, (scaledImageHeight - canvasRect.height) / 2);

      // Constrain pan values
      const constrainedPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
      const constrainedPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

      setPanX(constrainedPanX);
      setPanY(constrainedPanY);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    canvasElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isCropping, processedImage, zoomLevel, isDragging, panX, panY]);

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
  // Only generate if preview doesn't already exist (to preserve persisted preview)
  useEffect(() => {
    if (!originalImage) return;
    // If previewImage already exists, don't regenerate it (it might be from persistence)
    if (previewImage) return;

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
        setIsProcessing(true);
        try {
          const result = await processImage(previewImage, adjustments, crop);
          if (active) {
            // Use requestAnimationFrame to update state smoothly
            requestAnimationFrame(() => {
              if (active) {
                useEditorStore.setState({ processedImage: result });
                setIsProcessing(false);
              }
            });
          } else {
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("Failed to process image", error);
          if (active) setIsProcessing(false);
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

  // Show loading state when initializing/loading from IndexedDB
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Luma Forge</h1>
            <p className="text-lg text-muted-foreground">
              Loading your workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => {
              const hasChanges = originalImage && (
                adjustments.exposure !== 0 ||
                adjustments.contrast !== 0 ||
                adjustments.saturation !== 0 ||
                adjustments.temperature !== 0 ||
                adjustments.tint !== 0 ||
                adjustments.highlights !== 0 ||
                adjustments.shadows !== 0 ||
                adjustments.whiteBalance !== 0 ||
                adjustments.sharpness !== 0 ||
                adjustments.blur !== 0 ||
                JSON.stringify(adjustments.curves.master) !== JSON.stringify([{ x: 0, y: 0 }, { x: 1, y: 1 }]) ||
                JSON.stringify(adjustments.curves.red) !== JSON.stringify([{ x: 0, y: 0 }, { x: 1, y: 1 }]) ||
                JSON.stringify(adjustments.curves.green) !== JSON.stringify([{ x: 0, y: 0 }, { x: 1, y: 1 }]) ||
                JSON.stringify(adjustments.curves.blue) !== JSON.stringify([{ x: 0, y: 0 }, { x: 1, y: 1 }]) ||
                (crop.width !== 0 && crop.height !== 0) ||
                crop.rotation !== 0
              );

              if (hasChanges) {
                setShowClearDialog(true);
              } else {
                clearAll();
              }
            }}
            className="font-semibold text-zinc-100 hover:text-white transition-colors cursor-pointer"
          >
            Luma Forge
          </button>
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
                  transformOrigin: 'center center'
                }}
                draggable={false}
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
        </div>

        {/* Right Sidebar - Adjustments */}
        <div className="w-[320px] border-l border-zinc-800 bg-background flex flex-col shrink-0 z-30 shadow-xl">
          {/* Histogram and Metadata */}
          {originalImage && (
            <div className="flex flex-col gap-2 p-4">
              <Histogram imageSrc={processedImage || originalImage} />
              <ImageMetadata imageSrc={originalImage} />
            </div>
          )}

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

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard all changes?</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard all changes and start over? This will clear your current image and all adjustments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAll();
                setShowClearDialog(false);
              }}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
