import { create } from 'zustand';

export interface Point { x: number; y: number }

export interface Curves {
  master: Point[];
  red: Point[];
  green: Point[];
  blue: Point[];
}

export interface ImageAdjustments {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  blur: number;
  curves: Curves;
}

export interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  aspectRatio: number | null; // null for free
}

interface EditorState {
  originalImage: string | null; // Data URL
  processedImage: string | null; // Data URL for preview
  
  adjustments: ImageAdjustments;
  crop: CropState;
  
  history: { adjustments: ImageAdjustments; crop: CropState }[];
  historyIndex: number;
  
  setImage: (imageData: string) => void;
  updateAdjustments: (updates: Partial<ImageAdjustments>) => void;
  updateCrop: (updates: Partial<CropState>) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const DEFAULT_CURVES: Curves = {
    master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
};

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  curves: JSON.parse(JSON.stringify(DEFAULT_CURVES)), // Deep copy
};

const DEFAULT_CROP: CropState = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
  aspectRatio: null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  originalImage: null,
  processedImage: null,
  
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  crop: { ...DEFAULT_CROP },
  
  history: [],
  historyIndex: -1,
  
  setImage: (imageData) => {
    set({
      originalImage: imageData,
      processedImage: imageData,
      adjustments: { 
          ...DEFAULT_ADJUSTMENTS, 
          curves: JSON.parse(JSON.stringify(DEFAULT_CURVES)) 
      },
      crop: { ...DEFAULT_CROP },
      history: [],
      historyIndex: -1,
    });
  },
  
  updateAdjustments: (updates) => {
    const { adjustments, history, historyIndex } = get();
    const newAdjustments = { ...adjustments, ...updates };
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ adjustments, crop: get().crop });
    
    set({
      adjustments: newAdjustments,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateCrop: (updates) => {
     const { crop, history, historyIndex } = get();
     const newCrop = { ...crop, ...updates };

     // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ adjustments: get().adjustments, crop });

    set({
      crop: newCrop,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= 0) {
      const previousState = history[historyIndex];
      set({
        adjustments: previousState.adjustments,
        crop: previousState.crop,
        historyIndex: historyIndex - 1,
      });
    }
  },
  
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        adjustments: nextState.adjustments,
        crop: nextState.crop,
        historyIndex: historyIndex + 1,
      });
    }
  },

  reset: () => {
      set({
          adjustments: { 
              ...DEFAULT_ADJUSTMENTS,
              curves: JSON.parse(JSON.stringify(DEFAULT_CURVES))
          },
          crop: { ...DEFAULT_CROP },
          history: [],
          historyIndex: -1,
      });
  }
}));
