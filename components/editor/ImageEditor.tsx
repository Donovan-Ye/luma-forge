'use client';

import { useEffect, useState } from 'react';
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
    Plus
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { processImage } from '@/lib/image-processing/canvas-utils';

export function ImageEditor() {
  const { 
    originalImage, 
    processedImage, 
    adjustments, 
    crop, 
    undo, 
    redo, 
    reset, 
    history, 
    historyIndex 
  } = useEditorStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Determine if undo/redo should be enabled
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Handle image processing when adjustments/crop change
  useEffect(() => {
    if (!originalImage) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const result = await processImage(originalImage, adjustments, crop);
        if (active) {
          useEditorStore.setState({ processedImage: result });
        }
      } catch (error) {
        console.error("Failed to process image", error);
      } finally {
        if (active) setIsProcessing(false);
      }
    }, 50); 

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [originalImage, adjustments, crop]);

  const handleExport = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.download = `luma-edit-${Date.now()}.png`;
      link.href = processedImage;
      link.click();
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
            </div>
        </div>

        <div className="flex items-center gap-2">
             <Button 
                size="sm" 
                onClick={handleExport}
                disabled={!processedImage || isProcessing}
                className="bg-zinc-100 text-zinc-900 hover:bg-white"
             >
                <Download className="w-4 h-4 mr-2" />
                Export
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
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
                {processedImage ? (
                    <img 
                    src={processedImage} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain shadow-2xl ring-1 ring-zinc-800"
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s' }}
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
                            onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-none"
                            onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoomLevel(1)}>
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
