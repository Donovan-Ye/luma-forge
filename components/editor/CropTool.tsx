'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { useEditorStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Check, X, RotateCw } from 'lucide-react';

interface CropToolProps {
  onClose: () => void;
}

export function CropTool({ onClose }: CropToolProps) {
  const { originalImage, crop, updateCrop } = useEditorStore();
  
  const [cropPosition, setCropPosition] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(crop.rotation || 0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = () => {
    if (croppedAreaPixels) {
      updateCrop({
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        rotation: rotation,
      });
    }
    onClose();
  };

  if (!originalImage) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col">
      <div className="relative flex-1 bg-black/90">
        <Cropper
          image={originalImage}
          crop={cropPosition}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined} // TODO: Add aspect ratio support
          onCropChange={setCropPosition}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
        />
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
             <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                    <Label>Zoom</Label>
                    <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
                </div>
                <Slider 
                    value={[zoom]} 
                    min={1} 
                    max={3} 
                    step={0.1} 
                    onValueChange={(v) => setZoom(v[0])} 
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

