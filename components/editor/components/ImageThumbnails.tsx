'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ImageData } from '@/lib/store';

interface ImageThumbnailsProps {
  images: ImageData[];
  currentImageId: string | null;
  setCurrentImage: (id: string) => void;
  removeImage: (id: string) => void;
  addImage: (imageData: string) => void;
}

export function ImageThumbnails({
  images,
  currentImageId,
  setCurrentImage,
  removeImage,
  addImage,
}: ImageThumbnailsProps) {
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  // Filter out invalid selections (images that no longer exist) during render
  const validSelectedIds = useMemo(() => {
    const imageIds = new Set(images.map(img => img.id));
    const valid = new Set<string>();
    selectedImageIds.forEach((id) => {
      if (imageIds.has(id)) {
        valid.add(id);
      }
    });
    return valid;
  }, [images, selectedImageIds]);

  // Update lastClickedIndexRef when currentImageId changes
  useEffect(() => {
    if (currentImageId) {
      const index = images.findIndex(img => img.id === currentImageId);
      if (index !== -1) {
        lastClickedIndexRef.current = index;
      }
    }
  }, [currentImageId, images]);

  const handleImageClick = (
    imageId: string,
    imageIndex: number,
    event: React.MouseEvent
  ) => {
    const isShiftClick = event.shiftKey;
    const isCmdOrCtrlClick = event.metaKey || event.ctrlKey;

    if (isShiftClick && lastClickedIndexRef.current !== null) {
      // Range selection: select all images between last clicked and current
      const startIndex = Math.min(lastClickedIndexRef.current, imageIndex);
      const endIndex = Math.max(lastClickedIndexRef.current, imageIndex);
      const rangeIds = new Set<string>();

      for (let i = startIndex; i <= endIndex; i++) {
        rangeIds.add(images[i].id);
      }

      setSelectedImageIds(rangeIds);
      setCurrentImage(imageId);
    } else if (isCmdOrCtrlClick) {
      // Toggle selection of specific image
      setSelectedImageIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
        } else {
          newSet.add(imageId);
        }
        return newSet;
      });
      setCurrentImage(imageId);
    } else {
      // Normal click: clear selection and set current image
      setSelectedImageIds(new Set([imageId]));
      setCurrentImage(imageId);
    }

    lastClickedIndexRef.current = imageIndex;
  };

  return (
    <div className="h-24 border-t border-zinc-900 bg-zinc-950/50 px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-2 h-full">
        {images.map((image, index) => {
          const isSelected = validSelectedIds.has(image.id);
          const isCurrent = currentImageId === image.id;

          return (
            <div
              key={image.id}
              className="relative group shrink-0 h-full aspect-square"
            >
              <button
                onClick={(e) => handleImageClick(image.id, index, e)}
                className={`
                  relative w-full h-full rounded-lg overflow-hidden border-2
                  ${isCurrent
                    ? 'border-primary ring-2 ring-primary/20'
                    : isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-zinc-800 hover:border-zinc-700 transition-colors'
                  }
                `}
              >
                <img
                  src={image.processedImage || image.originalImage}
                  alt={`Image ${image.id}`}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
                )}
              </button>
              {images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (images.length > 1) {
                      removeImage(image.id);
                    }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Remove image"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {/* Add Image Button */}
        <button
          onClick={() => addImageInputRef.current?.click()}
          className="shrink-0 h-full aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900 transition-all flex items-center justify-center group"
          title="Add image"
        >
          <Plus className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
        </button>
        <input
          type="file"
          ref={addImageInputRef}
          onChange={(e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            imageFiles.forEach((file) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                if (e.target?.result) {
                  addImage(e.target.result as string);
                }
              };
              reader.readAsDataURL(file);
            });

            // Reset input to allow selecting the same file again
            if (addImageInputRef.current) {
              addImageInputRef.current.value = '';
            }
          }}
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>
    </div>
  );
}

