'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  RotateCcw,
  Undo,
  Redo,
  Eye,
} from 'lucide-react';
import { ImageAdjustments, CropState } from '@/lib/store';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from './LanguageToggle';

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
  selectedCount?: number;
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
  selectedCount = 0,
}: EditorHeaderProps) {
  const iconButtonClassName = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800";
  const iconClassName = "w-3! h-3!";
  const { t } = useTranslation();

  const exportLabel = isExporting
    ? t('exportButtonExporting')
    : selectedCount > 1
      ? t('exportButtonCount', { count: selectedCount })
      : t('exportButton');

  return (
    <header className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4 shrink-0 z-50">
      <div className="flex items-center gap-1">
        <button
          onClick={onClearAll}
          className="cursor-pointer transition-opacity hover:opacity-80"
          aria-label={t('resetWorkspace')}
        >
          <BrandLogo
            size={24}
            priority
            wordmarkClassName="text-xs text-zinc-100"
            className="gap-1"
          />
        </button>
        <Separator orientation="vertical" className="h-6 bg-zinc-800" />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            className={iconButtonClassName}
          >
            <Undo className={iconClassName} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            className={iconButtonClassName}
          >
            <Redo className={iconClassName} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={reset}
            className={iconButtonClassName}
          >
            <RotateCcw className={iconClassName} />
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
              className={`${iconButtonClassName} ${showOriginal ? 'bg-zinc-800 text-zinc-100' : ''}`}
              title={t('tooltipHoldOriginalDetail')}
            >
              <Eye className={iconClassName} />
            </Button>
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs text-zinc-300 bg-zinc-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {t('tooltipHoldOriginal')}
              <span className="ml-1.5 text-zinc-500">{t('tooltipShortcut')}</span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <LanguageToggle />
        <Button
          size="sm"
          onClick={onExport}
          disabled={isExporting || !processedImage}
          className="bg-zinc-100 text-zinc-900 hover:bg-white py-1! text-xs h-6"
        >
          {exportLabel}
        </Button>
      </div>
    </header>
  );
}

