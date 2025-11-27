'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Point } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store';

interface CurveEditorProps {
  points: Point[];
  onChange: (points: Point[]) => void;
  color: string;
  channel: 'master' | 'red' | 'green' | 'blue';
}

export function CurveEditor({ points, onChange, color, channel }: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const previewImage = useEditorStore((state) => state.previewImage);
  const [histogram, setHistogram] = useState<number[]>([]);

  // Calculate histogram from preview image
  useEffect(() => {
    if (!previewImage) {
      // Use setTimeout to avoid synchronous setState warning
      const timer = setTimeout(() => setHistogram([]), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate histogram for the selected channel
      const hist = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        let value: number;
        if (channel === 'master') {
          // Luminance: 0.299*R + 0.587*G + 0.114*B
          value = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        } else if (channel === 'red') {
          value = data[i];
        } else if (channel === 'green') {
          value = data[i + 1];
        } else {
          value = data[i + 2];
        }
        hist[value]++;
      }

      // Normalize histogram to 0-1 range
      const max = Math.max(...hist);
      const normalized = hist.map((v) => (max > 0 ? v / max : 0));
      if (!cancelled) {
        setHistogram(normalized);
      }
    };
    img.src = previewImage;

    return () => {
      cancelled = true;
    };
  }, [previewImage, channel]);

  // Sort points by x to ensure function validity
  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => a.x - b.x);
  }, [points]);

  // Generate smooth curve path using quadratic bezier curves
  const pathData = useMemo(() => {
    if (sortedPoints.length < 2) return '';

    let path = `M ${sortedPoints[0].x * 100} ${(1 - sortedPoints[0].y) * 100}`;

    for (let i = 1; i < sortedPoints.length; i++) {
      const prev = sortedPoints[i - 1];
      const curr = sortedPoints[i];

      if (i === 1) {
        // First segment: use control point between first two points
        const cpX = (prev.x + curr.x) / 2 * 100;
        const cpY = (1 - (prev.y + curr.y) / 2) * 100;
        path += ` Q ${cpX} ${cpY} ${curr.x * 100} ${(1 - curr.y) * 100}`;
      } else if (i === sortedPoints.length - 1) {
        // Last segment: use control point between last two points
        const cpX = (prev.x + curr.x) / 2 * 100;
        const cpY = (1 - (prev.y + curr.y) / 2) * 100;
        path += ` Q ${cpX} ${cpY} ${curr.x * 100} ${(1 - curr.y) * 100}`;
      } else {
        // Middle segments: use control points for smooth curves
        const next = sortedPoints[i + 1];
        const cpX = curr.x * 100;
        const cpY = (1 - curr.y) * 100;
        const endX = (curr.x + next.x) / 2 * 100;
        const endY = (1 - (curr.y + next.y) / 2) * 100;
        path += ` Q ${cpX} ${cpY} ${endX} ${endY}`;
      }
    }

    return path;
  }, [sortedPoints]);

  const getCoordinates = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Invert Y because SVG y=0 is top
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Find closest point on curve to click position
  const findClosestPointOnCurve = (x: number, y: number): number => {
    let minDist = Infinity;
    let closestIndex = -1;

    // Check distance to each point
    sortedPoints.forEach((p, i) => {
      const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
      if (dist < minDist && dist < 0.05) { // 5% threshold
        minDist = dist;
        closestIndex = i;
      }
    });

    return closestIndex;
  };

  const handlePointMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActivePointIndex(index);
    setIsDragging(true);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    // Don't add point if clicking on existing point
    if ((e.target as SVGElement).tagName === 'circle') {
      return;
    }

    const { x, y } = getCoordinates(e);

    // Check if clicking near an existing point
    const closestIndex = findClosestPointOnCurve(x, y);
    if (closestIndex >= 0) {
      // Clicking near existing point, start dragging it
      setActivePointIndex(closestIndex);
      setIsDragging(true);
      return;
    }

    // Add new point at click location
    // Don't allow adding points at the exact start/end (x=0 or x=1)
    if (x <= 0.01 || x >= 0.99) {
      return;
    }

    // Find insertion position
    let insertIndex = sortedPoints.length;
    for (let i = 0; i < sortedPoints.length; i++) {
      if (sortedPoints[i].x > x) {
        insertIndex = i;
        break;
      }
    }

    const newPoints = [...sortedPoints];
    newPoints.splice(insertIndex, 0, { x, y });

    // Update active point index to the newly added point
    setActivePointIndex(insertIndex);
    setIsDragging(true);
    onChange(newPoints);
  };

  useEffect(() => {
    if (!isDragging || activePointIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;

      const { x, y } = getCoordinates(e);
      const currentPoints = [...sortedPoints];

      // Ensure we have valid points array
      if (activePointIndex >= currentPoints.length) return;

      // Constrain X for start/end points
      if (activePointIndex === 0) {
        currentPoints[0] = { x: 0, y: Math.max(0, Math.min(1, y)) };
      } else if (activePointIndex === currentPoints.length - 1) {
        currentPoints[activePointIndex] = { x: 1, y: Math.max(0, Math.min(1, y)) };
      } else {
        // Constrain X between neighbors
        const prev = currentPoints[activePointIndex - 1];
        const next = currentPoints[activePointIndex + 1];
        const constrainedX = Math.max(prev.x + 0.01, Math.min(next.x - 0.01, x));
        currentPoints[activePointIndex] = {
          x: constrainedX,
          y: Math.max(0, Math.min(1, y))
        };
      }

      // Re-sort points by x to maintain order
      const reordered = [...currentPoints].sort((a, b) => a.x - b.x);
      const newActiveIndex = reordered.findIndex(
        (p) => {
          const originalPoint = currentPoints[activePointIndex];
          return Math.abs(p.x - originalPoint.x) < 0.001 && Math.abs(p.y - originalPoint.y) < 0.001;
        }
      );

      if (newActiveIndex >= 0) {
        setActivePointIndex(newActiveIndex);
      }

      onChange(reordered);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Keep activePointIndex for visual feedback
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activePointIndex, sortedPoints, onChange]);

  // Handle point deletion (double-click)
  const handlePointDoubleClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow deleting start/end points
    if (index === 0 || index === sortedPoints.length - 1) return;

    const newPoints = sortedPoints.filter((_, i) => i !== index);
    onChange(newPoints);
  };

  return (
    <div className="relative w-full aspect-square bg-muted/30 rounded-md border select-none">
      {/* Grid Lines */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={`v-${i}`} className="border-r border-muted-foreground/10 h-full" />
        ))}
        {[...Array(4)].map((_, i) => (
          <div key={`h-${i}`} className="border-b border-muted-foreground/10 w-full" />
        ))}
      </div>

      {/* Histogram */}
      {histogram.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <linearGradient id={`histogram-${channel}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {histogram.map((value, index) => {
            const x = (index / 255) * 100;
            const height = value * 100;
            return (
              <rect
                key={index}
                x={`${x}%`}
                y={`${100 - height}%`}
                width={`${100 / 256}%`}
                height={`${height}%`}
                fill={`url(#histogram-${channel})`}
              />
            );
          })}
        </svg>
      )}

      {/* Diagonal Reference */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1" />
      </svg>

      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseDown={handleSvgMouseDown}
      >
        {/* Curve Path */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className="pointer-events-none"
        />

        {/* Invisible wider path for easier clicking */}
        <path
          d={pathData}
          fill="none"
          stroke="transparent"
          strokeWidth="8"
          vectorEffect="non-scaling-stroke"
          className="cursor-crosshair"
        />

        {/* Control Points */}
        {sortedPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x * 100}
            cy={(1 - p.y) * 100}
            r="4"
            fill="white"
            stroke={color}
            strokeWidth="2"
            className={cn(
              "cursor-pointer hover:scale-125 transition-transform",
              activePointIndex === i && "scale-125 ring-2 ring-offset-1 ring-offset-background"
            )}
            onMouseDown={(e) => handlePointMouseDown(i, e)}
            onDoubleClick={(e) => handlePointDoubleClick(i, e)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

