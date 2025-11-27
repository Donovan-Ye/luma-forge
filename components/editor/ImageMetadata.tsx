'use client';

import { useEffect, useState } from 'react';

interface ImageMetadataProps {
  imageSrc: string | null;
}

interface Metadata {
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: string;
}

export function ImageMetadata({ imageSrc }: ImageMetadataProps) {
  const [metadata, setMetadata] = useState<Metadata & { fileFormat?: string }>({});

  useEffect(() => {
    if (!imageSrc) {
      setMetadata({});
      return;
    }

    // Detect file format from data URL
    let fileFormat = 'JPG';
    if (imageSrc.startsWith('data:image/')) {
      const match = imageSrc.match(/data:image\/(\w+)/);
      if (match) {
        const format = match[1].toUpperCase();
        fileFormat = format === 'JPEG' ? 'JPG' : format;
      }
    }

    // Load EXIF library dynamically
    import('exif-js').then((EXIF) => {
      const img = new Image();
      img.onload = () => {
        EXIF.getData(img as any, function() {
          const iso = EXIF.getTag(this, 'ISO');
          const fNumber = EXIF.getTag(this, 'FNumber');
          const exposureTime = EXIF.getTag(this, 'ExposureTime');
          const focalLength = EXIF.getTag(this, 'FocalLength');

          const result: Metadata & { fileFormat: string } = { fileFormat };

          if (iso) {
            result.iso = iso;
          }

          if (fNumber) {
            const apertureValue = fNumber;
            result.aperture = `F/${apertureValue.toFixed(1)}`;
          }

          if (exposureTime) {
            if (exposureTime < 1) {
              const denominator = Math.round(1 / exposureTime);
              result.shutterSpeed = `1/${denominator}秒`;
            } else {
              result.shutterSpeed = `${exposureTime.toFixed(1)}秒`;
            }
          }

          if (focalLength) {
            result.focalLength = `${Math.round(focalLength)}mm`;
          }

          setMetadata(result);
        });
      };
      img.src = imageSrc;
    }).catch(() => {
      // EXIF library failed to load or no EXIF data
      setMetadata({ fileFormat });
    });
  }, [imageSrc]);

  return (
    <div className="h-10 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-300">
      <div className="flex items-center gap-4">
        {metadata.iso && <span>ISO {metadata.iso}</span>}
        {metadata.focalLength && <span>{metadata.focalLength}</span>}
        {metadata.aperture && <span>{metadata.aperture}</span>}
        {metadata.shutterSpeed && <span>{metadata.shutterSpeed}</span>}
      </div>
      {metadata.fileFormat && (
        <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
          {metadata.fileFormat}
        </span>
      )}
    </div>
  );
}

