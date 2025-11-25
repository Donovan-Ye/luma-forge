'use client';

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/store';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { CropTool } from './CropTool';
import { Button } from '@/components/ui/button';
import { RotateCcw, Download, Undo, Redo, Loader2, Crop as CropIcon } from 'lucide-react';
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
      link.download = `edited-${Date.now()}.png`;
      link.href = processedImage;
      link.click();
    }
  };

  if (!originalImage) {
    return (
      <div className="container mx-auto py-20 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Luma Forge</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional grade online image editor. Adjust colors, crop, and enhance your photos directly in the browser.
          </p>
        </div>
        <ImageUpload />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background relative">
      {isCropping && <CropTool onClose={() => setIsCropping(false)} />}
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-muted/20 p-8 flex items-center justify-center overflow-hidden">
        <div className="relative shadow-lg max-h-full max-w-full flex items-center justify-center">
           {processedImage ? (
             <img 
               src={processedImage} 
               alt="Preview" 
               className="max-w-full max-h-[calc(100vh-8rem)] object-contain"
             />
           ) : (
             <div className="flex items-center justify-center h-64 w-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
           )}
        </div>
        
        {/* Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm z-10">
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={undo} 
             disabled={!canUndo}
             title="Undo"
           >
             <Undo className="w-4 h-4" />
           </Button>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={redo} 
             disabled={!canRedo}
             title="Redo"
           >
             <Redo className="w-4 h-4" />
           </Button>
           <Separator orientation="vertical" className="h-6" />
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={reset}
             title="Reset All"
           >
             <RotateCcw className="w-4 h-4" />
           </Button>
        </div>
      </div>

      {/* Sidebar - Tools & Adjustments */}
      <div className="w-80 border-l bg-background flex flex-col h-full z-20 shadow-xl">
        <div className="p-4 border-b">
            <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => setIsCropping(true)}
            >
                <CropIcon className="w-4 h-4 mr-2" />
                Crop & Rotate
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
           <AdjustmentsPanel />
        </div>
        
        <div className="p-4 border-t bg-background">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleExport}
            disabled={!processedImage || isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Export Image'}
          </Button>
        </div>
      </div>
    </div>
  );
}
