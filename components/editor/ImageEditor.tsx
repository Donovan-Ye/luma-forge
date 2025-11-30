'use client';

import { useState, useRef } from 'react';
import { useEditorStore, useOriginalImage, useProcessedImage, useAdjustments, useCrop, useHistory } from '@/lib/store';
import { CropTool } from './CropTool';
import { EditorHeader } from './EditorHeader';
import { CanvasViewport } from './CanvasViewport';
import { ImageThumbnails } from './ImageThumbnails';
import { EditorSidebar } from './EditorSidebar';
import { LoadingState } from './LoadingState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useDragAndPan } from './hooks/useDragAndPan';
import { useZoom } from './hooks/useZoom';
import { useImageProcessing } from './hooks/useImageProcessing';
import { processImage } from '@/lib/image-processing/canvas-utils';

export function ImageEditor() {
  const {
    images,
    currentImageId,
    setCurrentImage,
    removeImage,
    addImage,
    undo,
    redo,
    reset,
    isLoading,
    clearAll
  } = useEditorStore();

  const originalImage = useOriginalImage();
  const processedImage = useProcessedImage();
  const adjustments = useAdjustments();
  const crop = useCrop();
  const { history, historyIndex } = useHistory();

  const [isCropping, setIsCropping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  useImageProcessing();

  // Determine if undo/redo should be enabled
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Use custom hooks
  useKeyboardShortcuts({
    canUndo,
    canRedo,
    undo,
    redo,
    showOriginal,
    setShowOriginal,
  });

  useDragAndPan({
    isCropping,
    processedImage,
    zoomLevel,
    canvasRef,
    imageRef,
    panX,
    panY,
    setPanX,
    setPanY,
    setIsDragging,
  });

  useZoom({
    isCropping,
    processedImage,
    canvasRef,
    zoomLevel,
    setZoomLevel,
    setPanX,
    setPanY,
  });

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

  const handleClearAll = () => {
    if (!originalImage) return;

    const hasChanges = (
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
  };

  return (
    <>
      <LoadingState isLoading={isLoading} hasImage={!!originalImage} />

      {originalImage && (
        <div className="flex flex-col h-screen bg-zinc-950 text-foreground overflow-hidden">
          <EditorHeader
            canUndo={canUndo}
            canRedo={canRedo}
            undo={undo}
            redo={redo}
            reset={reset}
            showOriginal={showOriginal}
            setShowOriginal={setShowOriginal}
            isExporting={isExporting}
            processedImage={processedImage}
            onExport={handleExport}
            onClearAll={handleClearAll}
            adjustments={adjustments}
            crop={crop}
            originalImage={originalImage}
          />

          <div className="flex flex-1 overflow-hidden relative">
            {/* Crop Overlay */}
            {isCropping && (
              <div className="absolute inset-0 z-40">
                <CropTool onClose={() => setIsCropping(false)} />
              </div>
            )}

            {/* Main Canvas Area */}
            <div className="flex-1 bg-zinc-950 relative flex flex-col">
              <CanvasViewport
                canvasRef={canvasRef}
                imageRef={imageRef}
                showOriginal={showOriginal}
                originalImage={originalImage}
                processedImage={processedImage}
                zoomLevel={zoomLevel}
                panX={panX}
                panY={panY}
                isDragging={isDragging}
                setZoomLevel={setZoomLevel}
                setPanX={setPanX}
                setPanY={setPanY}
              />

              <ImageThumbnails
                images={images}
                currentImageId={currentImageId}
                setCurrentImage={setCurrentImage}
                removeImage={removeImage}
                addImage={addImage}
              />
            </div>

            <EditorSidebar
              originalImage={originalImage}
              processedImage={processedImage}
              onCropClick={() => setIsCropping(true)}
            />
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
      )}
    </>
  );
}
