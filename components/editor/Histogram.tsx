'use client';

import { useEffect, useState, useRef } from 'react';

interface HistogramProps {
  imageSrc: string | null;
}

interface RGBHistogram {
  red: number[];
  green: number[];
  blue: number[];
}

export function Histogram({ imageSrc }: HistogramProps) {
  const [histogram, setHistogram] = useState<RGBHistogram | null>(null);
  const currentImageSrcRef = useRef<string | null>(null);

  useEffect(() => {
    currentImageSrcRef.current = imageSrc;

    if (!imageSrc) {
      // Clear histogram asynchronously via callback
      requestAnimationFrame(() => {
        if (currentImageSrcRef.current === null) {
          setHistogram(null);
        }
      });
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || currentImageSrcRef.current !== imageSrc) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate histogram for each RGB channel
      const redHist = new Array(256).fill(0);
      const greenHist = new Array(256).fill(0);
      const blueHist = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        redHist[data[i]]++;
        greenHist[data[i + 1]]++;
        blueHist[data[i + 2]]++;
      }

      // Normalize histograms to 0-1 range
      const maxRed = Math.max(...redHist);
      const maxGreen = Math.max(...greenHist);
      const maxBlue = Math.max(...blueHist);
      const max = Math.max(maxRed, maxGreen, maxBlue);

      const normalized = {
        red: redHist.map((v) => (max > 0 ? v / max : 0)),
        green: greenHist.map((v) => (max > 0 ? v / max : 0)),
        blue: blueHist.map((v) => (max > 0 ? v / max : 0)),
      };

      if (!cancelled && currentImageSrcRef.current === imageSrc) {
        setHistogram(normalized);
      }
    };
    img.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  if (!histogram) {
    return (
      <div className="h-32 bg-black border-b border-zinc-800 flex items-center justify-center">
        <span className="text-xs text-zinc-600">No histogram data</span>
      </div>
    );
  }

  // Generate path data for line charts
  const generatePath = (values: number[]): string => {
    const points = values.map((value, index) => {
      const x = index;
      const y = 100 - (value * 100);
      return `${x} ${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // Generate filled path (closed area under the curve)
  const generateFilledPath = (values: number[]): string => {
    const points = values.map((value, index) => {
      const x = index;
      const y = 100 - (value * 100);
      return `${x} ${y}`;
    });
    // Close the path: curve -> bottom right -> bottom left -> start
    return `M ${points.join(' L ')} L 255 100 L 0 100 Z`;
  };

  const redPath = generatePath(histogram.red);
  const greenPath = generatePath(histogram.green);
  const bluePath = generatePath(histogram.blue);

  const redFilledPath = generateFilledPath(histogram.red);
  const greenFilledPath = generateFilledPath(histogram.green);
  const blueFilledPath = generateFilledPath(histogram.blue);

  return (
    <div className="h-32 bg-black border-b border-zinc-800 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 100" preserveAspectRatio="none">
        <defs>
          {/* Gradients for filled areas */}
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Filled areas under curves (rendered first, so lines appear on top) */}
        <path
          d={blueFilledPath}
          fill="url(#blueGradient)"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={greenFilledPath}
          fill="url(#greenGradient)"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={redFilledPath}
          fill="url(#redGradient)"
          vectorEffect="non-scaling-stroke"
        />

        {/* Curve lines (rendered on top) */}
        <path
          d={bluePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={greenPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1.5"
          opacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={redPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
          opacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

