'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { useEditorStore, useCrop } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2, Plus } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface CropToolProps {
  onClose: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number | undefined
): Crop {
  return centerCrop(
    aspect
      ? makeAspectCrop(
        {
          unit: '%',
          width: 70,
        },
        aspect,
        mediaWidth,
        mediaHeight
      )
      : { x: 0, y: 0, width: 70, height: 70, unit: '%' },
    mediaWidth,
    mediaHeight
  );
}

type Dimensions = {
  width: number;
  height: number;
};

export function CropTool({ onClose }: CropToolProps) {
  const {
    images,
    currentImageId,
    setCurrentImage,
    addImage,
    updateCrop,
  } = useEditorStore();
  const crop = useCrop();

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImage = images.find(img => img.id === currentImageId);

  const [cropState, setCropState] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(crop.rotation || 0);
  const [imageDimensions, setImageDimensions] = useState<Dimensions | null>(null);
  const [viewportSize, setViewportSize] = useState<Dimensions | null>(null);

  const updateViewportSize = useCallback(
    (dims?: Dimensions) => {
      const currentDims = dims ?? imageDimensions;
      if (!currentDims || !containerRef.current) {
        setViewportSize(null);
        return { width: 0, height: 0 };
      }

      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) {
        setViewportSize(null);
        return { width: 0, height: 0 };
      }

      const aspect = currentDims.width / currentDims.height;

      let height = clientHeight;
      let width = height * aspect;

      if (width > clientWidth) {
        width = clientWidth;
        height = width / aspect;
      }

      setViewportSize({ width, height });

      return { width, height };
    },
    [imageDimensions]
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;

      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      const {
        width: viewportWidth,
        height: viewportHeight,
      } = updateViewportSize({ width: naturalWidth, height: naturalHeight });

      // If we have existing crop, restore it; otherwise center crop
      if (crop.width > 0 && crop.height > 0) {
        // Convert pixel crop to percent crop for react-image-crop
        const percentCrop: Crop = {
          unit: '%',
          x: (crop.x / viewportWidth) * 100,
          y: (crop.y / viewportHeight) * 100,
          width: (crop.width / viewportWidth) * 100,
          height: (crop.height / viewportHeight) * 100,
        };
        setCropState(percentCrop);
      } else {
        const newCrop = centerAspectCrop(viewportWidth, viewportHeight, undefined);
        setCropState(newCrop);
      }
    },
    [crop, updateViewportSize]
  );

  useEffect(() => {
    // Initial viewport size calculation after container is mounted
    if (imageDimensions && containerRef.current) {
      // Use a small delay to ensure container dimensions are available
      const timer = setTimeout(() => {
        updateViewportSize();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [imageDimensions, updateViewportSize]);

  useEffect(() => {
    const handleResize = () => updateViewportSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateViewportSize]);

  const handleChange = useCallback((crop: Crop, percentCrop: Crop) => {
    // Use percentCrop to maintain crop position when image resizes
    setCropState(percentCrop);
  }, []);

  const handleComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
  }, []);

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        addImage(event.target.result as string);
        // Reset crop state for new image
        setCropState(undefined);
        setCompletedCrop(null);
        setImageDimensions(null);
        setViewportSize(null);
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectImage = (imageId: string) => {
    setCurrentImage(imageId);
    const selectedImage = images.find(img => img.id === imageId);
    if (selectedImage) {
      setRotation(selectedImage.crop.rotation || 0);
      // Reset dimensions to trigger recalculation
      setImageDimensions(null);
      setViewportSize(null);
    }
  };

  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
    // Update rotation in crop state
    updateCrop({ rotation: newRotation });
  };

  const handleApply = () => {
    if (completedCrop && imgRef.current && currentImage) {
      const crop = {
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height,
        rotation: rotation,
        sourceWidth: viewportSize?.width ?? 0,
        sourceHeight: viewportSize?.height ?? 0,
        aspectRatio: completedCrop.width / completedCrop.height,
      }
      updateCrop(crop);
    }
    onClose();
  };


  if (!currentImage) return null;

  // Check if viewport is ready (both image dimensions and viewport size are set and valid)
  const isViewportReady =
    imageDimensions &&
    viewportSize &&
    viewportSize.width > 0 &&
    viewportSize.height > 0

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col">
      <div
        ref={containerRef}
        className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden p-4"
      >
        {/* Loading indicator above the crop */}
        {!isViewportReady && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-white">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">Calculating viewport...</p>
          </div>
        )}

        <div
          className="flex items-center justify-center"
          style={{
            display: isViewportReady ? 'flex' : 'none',
            width: viewportSize?.width ?? 'auto',
            height: viewportSize?.height ?? 'auto',
          }}
        >
          <ReactCrop
            crop={cropState}
            onChange={handleChange}
            onComplete={handleComplete}
            aspect={undefined}
            className="w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={currentImage.originalImage}
              alt="Crop"
              onLoad={onImageLoad}
              key={currentImageId}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
                transition: 'transform 0.2s',
              }}
            />
          </ReactCrop>
        </div>
      </div>

      <div className="bg-background border-t flex flex-col">
        {/* Image thumbnails list */}
        <div className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => handleSelectImage(image.id)}
                className={`
                  relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all
                  ${currentImageId === image.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-muted hover:border-primary/50'
                  }
                `}
              >
                <img
                  src={image.processedImage || image.originalImage}
                  alt={`Image ${image.id}`}
                  className="w-full h-full object-cover"
                />
                {currentImageId === image.id && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                )}
              </button>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 flex items-center justify-center transition-colors"
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAddImage}
              className="hidden"
            />
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-8 max-w-2xl mx-auto w-full">
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <Label>Rotation</Label>
                <span className="text-xs text-muted-foreground">{rotation}°</span>
              </div>
              <Slider
                value={[rotation]}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) => handleRotationChange(v[0])}
              />
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Check className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

