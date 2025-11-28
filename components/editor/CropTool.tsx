'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { useEditorStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
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
  const { originalImage, crop, updateCrop } = useEditorStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropState, setCropState] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(crop.rotation || 0);
  const [imageDimensions, setImageDimensions] = useState<Dimensions | null>(null);
  const [viewportSize, setViewportSize] = useState<Dimensions | null>(null);

  const updateViewportSize = useCallback(
    (dims?: Dimensions) => {
      const currentDims = dims ?? imageDimensions;
      if (!currentDims || !containerRef.current) return;

      const { clientWidth, clientHeight } = containerRef.current;
      const aspect = currentDims.width / currentDims.height;

      let height = clientHeight;
      let width = height * aspect;

      if (width > clientWidth) {
        width = clientWidth;
        height = width / aspect;
      }

      setViewportSize({ width, height });
    },
    [imageDimensions]
  );

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: width, naturalHeight: height } = e.currentTarget;

      setImageDimensions({ width, height });
      updateViewportSize({ width, height });

      // If we have existing crop, restore it; otherwise center crop
      if (crop.width > 0 && crop.height > 0) {
        // Convert pixel crop to percent crop for react-image-crop
        const percentCrop: Crop = {
          unit: '%',
          x: (crop.x / width) * 100,
          y: (crop.y / height) * 100,
          width: (crop.width / width) * 100,
          height: (crop.height / height) * 100,
        };
        setCropState(percentCrop);
      } else {
        const newCrop = centerAspectCrop(width, height, undefined);
        setCropState(newCrop);
      }
    },
    [crop, updateViewportSize]
  );

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

  const handleApply = () => {
    if (completedCrop && imgRef.current) {
      updateCrop({
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height,
        rotation: rotation,
      });
    }
    onClose();
  };

  if (!originalImage) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col">
      <div
        ref={containerRef}
        className="relative flex-1 bg-black/90 flex items-center justify-center overflow-hidden p-4"
      >
        <div
          className="flex items-center justify-center"
          style={{
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
              src={originalImage}
              alt="Crop"
              onLoad={onImageLoad}
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

      <div className="h-48 bg-background border-t p-6 flex flex-col gap-6">
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
              onValueChange={(v) => setRotation(v[0])}
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
  );
}

