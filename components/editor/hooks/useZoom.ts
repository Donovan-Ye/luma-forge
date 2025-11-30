import { useEffect } from 'react';

export function useZoom({
  isCropping,
  processedImage,
  canvasRef,
  zoomLevel,
  setZoomLevel,
  setPanX,
  setPanY,
}: {
  isCropping: boolean;
  processedImage: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  zoomLevel: number;
  setZoomLevel: (level: number | ((prev: number) => number)) => void;
  setPanX: (x: number) => void;
  setPanY: (y: number) => void;
}) {
  // Reset pan when zoom resets to 1x
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanX(0);
      setPanY(0);
    }
  }, [zoomLevel, setPanX, setPanY]);

  // Handle scroll zoom with native event listener
  useEffect(() => {
    if (isCropping || !processedImage) return;

    const handleWheel = (e: WheelEvent) => {
      const canvasElement = canvasRef.current;
      if (!canvasElement) return;

      // Check if the event is within the canvas area
      const rect = canvasElement.getBoundingClientRect();
      const isInsideCanvas =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isInsideCanvas) return;

      e.preventDefault();
      e.stopPropagation();

      // Use ctrl/cmd key for more precise zoom control
      const isPreciseZoom = e.ctrlKey || e.metaKey;
      const zoomFactor = isPreciseZoom ? 1.05 : 1.15;

      // deltaY > 0 means scrolling down (zoom out), deltaY < 0 means scrolling up (zoom in)
      const isZoomIn = e.deltaY < 0;

      setZoomLevel((prevZoom) => {
        const newZoom = isZoomIn
          ? prevZoom * zoomFactor
          : prevZoom / zoomFactor;

        // Clamp between 0.1x and 5x
        return Math.max(0.1, Math.min(5, newZoom));
      });
    };

    // Attach to window to catch all wheel events, then filter by position
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isCropping, processedImage, canvasRef, setZoomLevel]);
}

