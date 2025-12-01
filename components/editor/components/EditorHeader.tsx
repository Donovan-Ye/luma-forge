'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  RotateCcw,
  Download,
  Undo,
  Redo,
  Eye,
} from 'lucide-react';
import { ImageAdjustments, CropState } from '@/lib/store';

interface EditorHeaderProps {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
  isExporting: boolean;
  processedImage: string | null;
  onExport: () => void;
  onClearAll: () => void;
  adjustments: ImageAdjustments;
  crop: CropState;
  originalImage: string | null;
}

export function EditorHeader({
  canUndo,
  canRedo,
  undo,
  redo,
  reset,
  showOriginal,
  setShowOriginal,
  isExporting,
  processedImage,
  onExport,
  onClearAll,
}: EditorHeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onClearAll}
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
          onClick={onExport}
          disabled={isExporting || !processedImage}
          className="bg-zinc-100 text-zinc-900 hover:bg-white"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>
    </header>
  );
}

