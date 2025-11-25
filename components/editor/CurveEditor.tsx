'use client';

import { useRef, useState, useEffect } from 'react';
import { Point } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CurveEditorProps {
  points: Point[];
  onChange: (points: Point[]) => void;
  color: string;
}

export function CurveEditor({ points, onChange, color }: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sort points by x to ensure function validity
  const sortedPoints = [...points].sort((a, b) => a.x - b.x);

  const getCoordinates = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Invert Y because SVG y=0 is top
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePointIndex(index);
    setIsDragging(true);
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    // Add new point if not clicking on existing point
    // Simplified: only allow moving existing points for MVP to avoid complexity
    // Or: check distance to line to add point
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || activePointIndex === null) return;
      
      const { x, y } = getCoordinates(e);
      const newPoints = [...sortedPoints];
      
      // Constrain X for start/end points
      if (activePointIndex === 0) {
        newPoints[activePointIndex] = { x: 0, y };
      } else if (activePointIndex === newPoints.length - 1) {
        newPoints[activePointIndex] = { x: 1, y };
      } else {
        // Constrain X between neighbors
        const prev = newPoints[activePointIndex - 1];
        const next = newPoints[activePointIndex + 1];
        const constrainedX = Math.max(prev.x + 0.01, Math.min(next.x - 0.01, x));
        newPoints[activePointIndex] = { x: constrainedX, y };
      }
      
      onChange(newPoints);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActivePointIndex(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activePointIndex, sortedPoints, onChange]);

  // Generate Path
  // Simple polyline for now, or basic spline
  // Using Catmull-Rom or simple Lineto for robustness
  const pathData = sortedPoints.map((p, i) => {
    // Map to SVG coordinates (y inverted)
    const sx = p.x * 100;
    const sy = (1 - p.y) * 100;
    return `${i === 0 ? 'M' : 'L'} ${sx} ${sy}`;
  }).join(' ');

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
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
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
                activePointIndex === i && "scale-125"
            )}
            onMouseDown={(e) => handleMouseDown(i, e)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

