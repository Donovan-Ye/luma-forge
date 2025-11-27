'use client';

import { useEffect, useState, useRef } from 'react';

interface ImageMetadataProps {
  imageSrc: string | null;
}

interface Metadata {
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  focalLength?: string;
}

interface ExifData {
  ISO?: number;
  FNumber?: number;
  ExposureTime?: number;
  FocalLength?: number;
}

export function ImageMetadata({ imageSrc }: ImageMetadataProps) {
  const [metadata, setMetadata] = useState<Metadata & { fileFormat?: string }>({});
  const currentImageSrcRef = useRef<string | null>(null);

  useEffect(() => {
    currentImageSrcRef.current = imageSrc;

    if (!imageSrc) {
      requestAnimationFrame(() => {
        if (currentImageSrcRef.current === null) {
          setMetadata({});
        }
      });
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
    import('exifr').then((exifr) => {
      // Parse EXIF data from the image
      exifr.parse(imageSrc, {
        pick: ['ISO', 'FNumber', 'ExposureTime', 'FocalLength']
      }).then((exifData: ExifData | null) => {
        if (currentImageSrcRef.current !== imageSrc) return;

        const result: Metadata & { fileFormat: string } = { fileFormat };

        if (exifData?.ISO) {
          result.iso = exifData.ISO;
        }

        if (exifData?.FNumber) {
          const apertureValue = exifData.FNumber;
          result.aperture = `F/${apertureValue.toFixed(1)}`;
        }

        if (exifData?.ExposureTime) {
          const exposureTime = exifData.ExposureTime;
          if (exposureTime < 1) {
            const denominator = Math.round(1 / exposureTime);
            result.shutterSpeed = `1/${denominator}秒`;
          } else {
            result.shutterSpeed = `${exposureTime.toFixed(1)}秒`;
          }
        }

        if (exifData?.FocalLength) {
          result.focalLength = `${Math.round(exifData.FocalLength)}mm`;
        }

        setMetadata(result);
      }).catch(() => {
        // EXIF library failed to load or no EXIF data
        if (currentImageSrcRef.current === imageSrc) {
          setMetadata({ fileFormat });
        }
      });
    }).catch(() => {
      // Library failed to load
      if (currentImageSrcRef.current === imageSrc) {
        setMetadata({ fileFormat });
      }
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
        <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
          {metadata.fileFormat}
        </span>
      )}
    </div>
  );
}

