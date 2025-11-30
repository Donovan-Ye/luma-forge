'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crop as CropIcon } from 'lucide-react';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { Histogram } from './Histogram';
import { ImageMetadata } from './ImageMetadata';

interface EditorSidebarProps {
  originalImage: string | null;
  processedImage: string | null;
  onCropClick: () => void;
}

export function EditorSidebar({
  originalImage,
  processedImage,
  onCropClick,
}: EditorSidebarProps) {
  return (
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
          onClick={onCropClick}
        >
          <CropIcon className="w-4 h-4 mr-2" />
          Crop & Rotate
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <AdjustmentsPanel />
      </ScrollArea>
    </div>
  );
}

