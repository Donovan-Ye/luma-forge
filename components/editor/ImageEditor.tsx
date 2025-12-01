'use client';

import { useState, useRef } from 'react';
import { useEditorStore, useOriginalImage, useProcessedImage, useAdjustments, useCrop, useHistory } from '@/lib/store';
import { CropTool } from './panels/CropTool';
import { EditorHeader } from './components/EditorHeader';
import { CanvasViewport } from './components/CanvasViewport';
import { ImageThumbnails } from './components/ImageThumbnails';
import { EditorSidebar } from './components/EditorSidebar';
import { LoadingState } from './components/LoadingState';
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
import JSZip from 'jszip';

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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [exportProgress, setExportProgress] = useState<{
    isExporting: boolean;
    current: number;
    total: number;
    currentImageName: string;
  } | null>(null);

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
    // Determine which images to export
    const imagesToExport = selectedImageIds.size > 0
      ? images.filter(img => selectedImageIds.has(img.id))
      : currentImageId
        ? images.filter(img => img.id === currentImageId)
        : [];

    if (imagesToExport.length === 0) return;

    setIsExporting(true);
    setExportProgress({
      isExporting: true,
      current: 0,
      total: imagesToExport.length,
      currentImageName: '',
    });

    try {
      // For single image, download directly (works reliably)
      if (imagesToExport.length === 1) {
        const image = imagesToExport[0];

        setExportProgress({
          isExporting: true,
          current: 1,
          total: 1,
          currentImageName: 'Processing...',
        });

        // Process the FULL resolution image on export
        const fullResResult = await processImage(
          image.originalImage,
          image.adjustments,
          image.crop,
          {
            format: 'image/jpeg',
            quality: 0.92
          }
        );

        if (!fullResResult) {
          throw new Error('Failed to process image');
        }

        // Convert data URL to blob URL for more reliable downloads
        let downloadUrl = fullResResult;
        let blobUrl: string | null = null;

        if (fullResResult.startsWith('data:')) {
          const response = await fetch(fullResResult);
          const blob = await response.blob();
          blobUrl = URL.createObjectURL(blob);
          downloadUrl = blobUrl;
        }

        // Create download link and trigger download
        const link = document.createElement('a');
        const timestamp = Date.now();
        const filename = `luma-edit-${image.id}-${timestamp}.jpg`;
        link.download = filename;
        link.href = downloadUrl;
        link.style.display = 'none';
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        await new Promise(resolve => requestAnimationFrame(resolve));
        link.click();

        setTimeout(() => {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        }, 100);
      } else {
        // For multiple images, create a ZIP file
        const zip = new JSZip();
        const timestamp = Date.now();

        // Process all images and add to ZIP
        for (let i = 0; i < imagesToExport.length; i++) {
          const image = imagesToExport[i];

          setExportProgress({
            isExporting: true,
            current: i + 1,
            total: imagesToExport.length,
            currentImageName: `Processing image ${i + 1}...`,
          });

          // Process the FULL resolution image
          const fullResResult = await processImage(
            image.originalImage,
            image.adjustments,
            image.crop,
            {
              format: 'image/jpeg',
              quality: 0.92
            }
          );

          if (!fullResResult) {
            console.error(`Failed to process image ${image.id}`);
            continue;
          }

          // Convert data URL to blob
          const response = await fetch(fullResResult);
          const blob = await response.blob();

          // Add to ZIP with a clean filename
          const filename = `luma-edit-${image.id}-${i + 1}.jpg`;
          zip.file(filename, blob);
        }

        setExportProgress({
          isExporting: true,
          current: imagesToExport.length,
          total: imagesToExport.length,
          currentImageName: 'Creating ZIP file...',
        });

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);

        // Download ZIP file
        const link = document.createElement('a');
        const zipFilename = `luma-export-${timestamp}.zip`;
        link.download = zipFilename;
        link.href = zipUrl;
        link.style.display = 'none';
        link.setAttribute('download', zipFilename);

        document.body.appendChild(link);
        await new Promise(resolve => requestAnimationFrame(resolve));
        link.click();

        setTimeout(() => {
          if (link.parentNode) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(zipUrl);
        }, 100);
      }
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export images");
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleClearAll = () => {
    setShowClearDialog(true);
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
            selectedCount={selectedImageIds.size}
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
                onCropClick={() => setIsCropping(true)}
              />

              <ImageThumbnails
                images={images}
                currentImageId={currentImageId}
                setCurrentImage={setCurrentImage}
                removeImage={removeImage}
                addImage={addImage}
                onSelectionChange={setSelectedImageIds}
              />
            </div>

            <EditorSidebar
              originalImage={originalImage}
              processedImage={processedImage}
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

          {/* Export Progress Dialog */}
          <Dialog open={!!exportProgress} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Exporting Images</DialogTitle>
                <DialogDescription>
                  {exportProgress && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm text-zinc-400">
                        <span>{exportProgress.currentImageName}</span>
                        <span>{exportProgress.current} / {exportProgress.total}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{
                            width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}
