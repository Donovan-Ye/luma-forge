import { useEffect } from 'react';

export function useKeyboardShortcuts({
  canUndo,
  canRedo,
  undo,
  redo,
  showOriginal,
  setShowOriginal,
}: {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  showOriginal: boolean;
  setShowOriginal: (show: boolean) => void;
}) {
  // Handle global mouse/touch/keyboard events for show original button
  useEffect(() => {
    const handleMouseUp = () => {
      if (showOriginal) setShowOriginal(false);
    };
    const handleTouchEnd = () => {
      if (showOriginal) setShowOriginal(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if spacebar is pressed and user is not typing in an input/textarea
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowOriginal(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setShowOriginal(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showOriginal, setShowOriginal]);

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;

      // Undo: Cmd/Ctrl + Z (without Shift)
      if (isModifierPressed && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Redo: Cmd/Ctrl + Shift + Z (or Cmd/Ctrl + Y on Windows/Linux)
      if (
        isModifierPressed &&
        ((e.shiftKey && e.key === 'z') || e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);
}

