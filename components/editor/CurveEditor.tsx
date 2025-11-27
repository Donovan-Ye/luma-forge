'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Point } from '@/lib/store';
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
  // Track the original point being dragged to prevent drift after re-sorting
  const dragStartPointRef = useRef<Point | null>(null);
  // Local state for immediate visual feedback during dragging
  const [localPoints, setLocalPoints] = useState<Point[] | null>(null);
  const rafRef = useRef<number | null>(null);
  const onChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Mouse position for auxiliary line
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

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
  // Use local points during dragging for immediate feedback, otherwise use props
  const sortedPoints = useMemo(() => {
    const pointsToUse = localPoints || points;
    return [...pointsToUse].sort((a, b) => a.x - b.x);
  }, [points, localPoints]);

  // Generate piecewise linear curve path that passes through all points
  // This matches the linear interpolation used in createLUT
  const pathData = useMemo(() => {
    if (sortedPoints.length < 2) return '';

    // Convert points to SVG coordinates
    const svgPoints = sortedPoints.map(p => ({
      x: p.x * 100,
      y: (1 - p.y) * 100
    }));

    // Build path using simple lines - guaranteed to pass through all points
    let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;

    for (let i = 1; i < svgPoints.length; i++) {
      path += ` L ${svgPoints[i].x} ${svgPoints[i].y}`;
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

  // Calculate Y value on the curve for a given X using linear interpolation
  const getYOnCurve = (x: number): number => {
    if (sortedPoints.length < 2) return 0.5;

    // Find the segment that contains this X value
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];

      if (x >= p1.x && x <= p2.x) {
        // Linear interpolation
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + (p2.y - p1.y) * t;
      }
    }

    // If outside bounds, extrapolate
    if (x < sortedPoints[0].x) {
      return sortedPoints[0].y;
    }
    if (x > sortedPoints[sortedPoints.length - 1].x) {
      return sortedPoints[sortedPoints.length - 1].y;
    }

    return 0.5;
  };

  const handlePointMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActivePointIndex(index);
    setIsDragging(true);
    // Store the original point coordinates to track it through re-sorts
    dragStartPointRef.current = { ...sortedPoints[index] };
    // Initialize local points for immediate visual feedback
    setLocalPoints([...sortedPoints]);
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
      dragStartPointRef.current = { ...sortedPoints[closestIndex] };
      // Initialize local points for immediate visual feedback
      setLocalPoints([...sortedPoints]);
      return;
    }

    // Add new point at click location
    // Don't allow adding points at the exact start/end (x=0 or x=1)
    if (x <= 0.01 || x >= 0.99) {
      return;
    }

    // Calculate Y value on the curve for this X position
    // This ensures the point is exactly on the curve line
    const yOnCurve = getYOnCurve(x);

    // Find insertion position
    let insertIndex = sortedPoints.length;
    for (let i = 0; i < sortedPoints.length; i++) {
      if (sortedPoints[i].x > x) {
        insertIndex = i;
        break;
      }
    }

    const newPoints = [...sortedPoints];
    newPoints.splice(insertIndex, 0, { x, y: yOnCurve });

    // Update active point index to the newly added point
    setActivePointIndex(insertIndex);
    setIsDragging(true);
    dragStartPointRef.current = { x, y: yOnCurve };
    onChange(newPoints);
  };

  useEffect(() => {
    if (!isDragging || activePointIndex === null || !dragStartPointRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current || !dragStartPointRef.current) return;

      // Cancel any pending animation frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      rafRef.current = requestAnimationFrame(() => {
        if (!svgRef.current || !dragStartPointRef.current) return;

        const { x, y } = getCoordinates(e);
        const currentPoints = localPoints ? [...localPoints] : [...sortedPoints];
        const originalPoint = dragStartPointRef.current;

        // Find the point we're dragging by matching the original coordinates
        // This is more reliable than using index after re-sorting
        let targetIndex = currentPoints.findIndex(
          (p) => Math.abs(p.x - originalPoint.x) < 0.001 && Math.abs(p.y - originalPoint.y) < 0.001
        );

        // Fallback to activePointIndex if we can't find it
        if (targetIndex === -1) {
          targetIndex = activePointIndex;
        }

        // Ensure we have valid points array
        if (targetIndex < 0 || targetIndex >= currentPoints.length) return;

        // Constrain X for start/end points
        if (targetIndex === 0) {
          currentPoints[0] = { x: 0, y: Math.max(0, Math.min(1, y)) };
        } else if (targetIndex === currentPoints.length - 1) {
          currentPoints[targetIndex] = { x: 1, y: Math.max(0, Math.min(1, y)) };
        } else {
          // Constrain X between neighbors
          const prev = currentPoints[targetIndex - 1];
          const next = currentPoints[targetIndex + 1];
          const constrainedX = Math.max(prev.x + 0.01, Math.min(next.x - 0.01, x));
          currentPoints[targetIndex] = {
            x: constrainedX,
            y: Math.max(0, Math.min(1, y))
          };
        }

        // Update the ref with new position before re-sorting
        dragStartPointRef.current = { ...currentPoints[targetIndex] };

        // Re-sort points by x to maintain order
        const reordered = [...currentPoints].sort((a, b) => a.x - b.x);

        // Find the new index after re-sorting by matching the updated point
        const newActiveIndex = reordered.findIndex(
          (p) => {
            const updatedPoint = dragStartPointRef.current!;
            return Math.abs(p.x - updatedPoint.x) < 0.001 && Math.abs(p.y - updatedPoint.y) < 0.001;
          }
        );

        if (newActiveIndex >= 0) {
          setActivePointIndex(newActiveIndex);
          // Update ref to new position after sort
          dragStartPointRef.current = { ...reordered[newActiveIndex] };
        }

        // Update local state immediately for visual feedback
        setLocalPoints(reordered);

        // Throttle onChange to avoid too many parent updates
        // Clear any pending timeout
        if (onChangeTimeoutRef.current) {
          clearTimeout(onChangeTimeoutRef.current);
        }
        // Only update parent state every 16ms (60fps) to avoid lag
        onChangeTimeoutRef.current = setTimeout(() => {
          onChange(reordered);
        }, 16);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartPointRef.current = null;

      // Cancel any pending timeout
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
        onChangeTimeoutRef.current = null;
      }

      // Sync final state immediately and clear local points
      if (localPoints) {
        onChange(localPoints);
        setLocalPoints(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
    };
  }, [isDragging, activePointIndex, sortedPoints, localPoints, onChange]);

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
        onMouseMove={(e) => {
          if (!isDragging) {
            const { x, y } = getCoordinates(e);
            setMousePosition({ x, y });
          }
        }}
        onMouseLeave={() => {
          if (!isDragging) {
            setMousePosition(null);
          }
        }}
      >
        {/* Auxiliary vertical line and intersection point */}
        {mousePosition && !isDragging && (
          <>
            {/* Vertical auxiliary line */}
            <line
              x1={mousePosition.x * 100}
              y1="0"
              x2={mousePosition.x * 100}
              y2="100"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.3"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
            />
            {/* Intersection point on curve */}
            {(() => {
              const curveY = getYOnCurve(mousePosition.x);
              const cx = mousePosition.x * 100;
              const cy = (1 - curveY) * 100;
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.9"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="1.5 1.5"
                    opacity="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })()}
          </>
        )}

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
        {sortedPoints.map((p, i) => {
          const cx = p.x * 100;
          const cy = (1 - p.y) * 100;
          const isActive = activePointIndex === i;
          const scale = isActive ? 1.25 : 1;

          return (
            <g
              key={i}
              transform={`translate(${cx}, ${cy}) scale(${scale})`}
              className="cursor-pointer"
              style={{ transition: isDragging ? 'none' : 'transform 0.1s' }}
            >
              <circle
                cx="0"
                cy="0"
                r="2"
                fill="white"
                stroke={color}
                strokeWidth="1.5"
                onMouseDown={(e) => handlePointMouseDown(i, e)}
                onDoubleClick={(e) => handlePointDoubleClick(i, e)}
                vectorEffect="non-scaling-stroke"
              />
              {isActive && (
                <circle
                  cx="0"
                  cy="0"
                  r="3.5"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

