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
import { dataUrlToBlob, downloadBlob } from '@/lib/download-utils';
import JSZip from 'jszip';
import { useTranslation } from '@/lib/i18n/useTranslation';

const EXPORT_QUALITY = 0.97;


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
  const { t } = useTranslation();

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
      // For single image, download directly
      if (imagesToExport.length === 1) {
        const image = imagesToExport[0];

        setExportProgress({
          isExporting: true,
          current: 1,
          total: 1,
          currentImageName: t('exportProcessingSingle'),
        });

        // Process the FULL resolution image on export
        // Use JPEG format with high quality for good quality but smaller file size
        const fullResResult = await processImage(
          image.originalImage,
          image.adjustments,
          image.crop,
          {
            format: 'image/jpeg',
            quality: EXPORT_QUALITY
          }
        );

        if (!fullResResult) {
          throw new Error('Failed to process image');
        }

        const blob = await dataUrlToBlob(fullResResult);
        const filename = `luma-edit-${Date.now()}.jpg`;

        await downloadBlob(blob, {
          filename,
          description: 'JPEG Image',
          accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
        });
        return;
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
            currentImageName: t('exportProcessingMultiple', { index: i + 1 }),
          });

          // Process the FULL resolution image
          const fullResResult = await processImage(
            image.originalImage,
            image.adjustments,
            image.crop,
            {
              format: 'image/jpeg',
              quality: EXPORT_QUALITY
            }
          );

          if (!fullResResult) {
            console.error(`Failed to process image ${image.id}`);
            continue;
          }

          // Convert data URL to blob
          const blob = await dataUrlToBlob(fullResResult);

          // Add to ZIP with a clean filename
          const filename = `luma-edit-${image.id}-${i + 1}.jpg`;
          zip.file(filename, blob);
        }

        setExportProgress({
          isExporting: true,
          current: imagesToExport.length,
          total: imagesToExport.length,
          currentImageName: t('exportCreatingZip'),
        });

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `luma-export-${timestamp}.zip`;

        await downloadBlob(zipBlob, {
          filename: zipFilename,
          description: 'Luma Forge Export',
          accept: { 'application/zip': ['.zip'] },
        });
      }
    } catch (error) {
      console.error("Export failed", error);
      alert(t('exportError'));
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
                <DialogTitle>{t('dialogDiscardTitle')}</DialogTitle>
                <DialogDescription>
                  {t('dialogDiscardDescription')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowClearDialog(false)}
                >
                  {t('dialogCancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    clearAll();
                    setShowClearDialog(false);
                  }}
                >
                  {t('dialogConfirmDiscard')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export Progress Dialog */}
          <Dialog open={!!exportProgress} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dialogExportTitle')}</DialogTitle>
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
