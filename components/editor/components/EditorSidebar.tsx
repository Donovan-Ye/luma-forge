'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { AdjustmentsPanel } from '../panels/AdjustmentsPanel';
import { Histogram } from '../widgets/Histogram';
import { ImageMetadata } from '../widgets/ImageMetadata';

interface EditorSidebarProps {
  originalImage: string | null;
  processedImage: string | null;
}

export function EditorSidebar({
  originalImage,
  processedImage,
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

      <ScrollArea className="flex-1">
        <AdjustmentsPanel />
      </ScrollArea>
    </div>
  );
}

