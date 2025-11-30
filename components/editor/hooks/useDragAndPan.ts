import { useEffect, useRef } from 'react';

export function useDragAndPan({
  isCropping,
  processedImage,
  zoomLevel,
  canvasRef,
  imageRef,
  panX,
  panY,
  setPanX,
  setPanY,
  setIsDragging,
}: {
  isCropping: boolean;
  processedImage: string | null;
  zoomLevel: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  panX: number;
  panY: number;
  setPanX: (x: number) => void;
  setPanY: (y: number) => void;
  setIsDragging: (dragging: boolean) => void;
}) {
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (isCropping || !processedImage || zoomLevel === 1) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only start dragging if clicking on the image or canvas area
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target === canvasRef.current) {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX,
          panY
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !canvasRef.current || !imageRef.current) return;
      e.preventDefault();

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const newPanX = dragStartRef.current.panX + deltaX;
      const newPanY = dragStartRef.current.panY + deltaY;

      // Calculate bounds based on image and canvas dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate the scaled image dimensions
      const scaledWidth = imgRect.width / zoomLevel;
      const scaledHeight = imgRect.height / zoomLevel;
      const scaledImageWidth = scaledWidth * zoomLevel;
      const scaledImageHeight = scaledHeight * zoomLevel;

      // Calculate max pan bounds (allow some overflow for better UX)
      const maxPanX = Math.max(0, (scaledImageWidth - canvasRect.width) / 2);
      const maxPanY = Math.max(0, (scaledImageHeight - canvasRect.height) / 2);

      // Constrain pan values
      const constrainedPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
      const constrainedPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

      setPanX(constrainedPanX);
      setPanY(constrainedPanY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target === canvasRef.current) {
        if (e.touches.length === 1) {
          e.preventDefault();
          setIsDragging(true);
          dragStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            panX,
            panY
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current || e.touches.length !== 1 || !canvasRef.current || !imageRef.current) return;
      e.preventDefault();

      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;

      const newPanX = dragStartRef.current.panX + deltaX;
      const newPanY = dragStartRef.current.panY + deltaY;

      // Calculate bounds based on image and canvas dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate the scaled image dimensions
      const scaledWidth = imgRect.width / zoomLevel;
      const scaledHeight = imgRect.height / zoomLevel;
      const scaledImageWidth = scaledWidth * zoomLevel;
      const scaledImageHeight = scaledHeight * zoomLevel;

      // Calculate max pan bounds (allow some overflow for better UX)
      const maxPanX = Math.max(0, (scaledImageWidth - canvasRect.width) / 2);
      const maxPanY = Math.max(0, (scaledImageHeight - canvasRect.height) / 2);

      // Constrain pan values
      const constrainedPanX = Math.max(-maxPanX, Math.min(maxPanX, newPanX));
      const constrainedPanY = Math.max(-maxPanY, Math.min(maxPanY, newPanY));

      setPanX(constrainedPanX);
      setPanY(constrainedPanY);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    canvasElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isCropping, processedImage, zoomLevel, panX, panY, canvasRef, imageRef, setPanX, setPanY, setIsDragging]);
}

