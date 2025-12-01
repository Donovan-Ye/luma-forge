import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import {
  storeImageBlobs,
  getImageBlobs,
  clearAllImageBlobs,
} from './indexeddb-utils';

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
  whiteBalance: number;
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
  aspectRatio: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface ImageData {
  id: string;
  originalImage: string; // Data URL (Full Resolution)
  previewImage: string | null; // Data URL (Low Resolution for editing)
  processedImage: string | null; // Data URL for result preview
  adjustments: ImageAdjustments;
  crop: CropState;
  history: { adjustments: ImageAdjustments; crop: CropState }[];
  historyIndex: number;
}

interface EditorState {
  images: ImageData[];
  currentImageId: string | null;
  isLoading: boolean; // Loading state for IndexedDB operations

  // Actions
  setImage: (imageData: string) => void;
  addImage: (imageData: string) => void;
  addImages: (imageData: string[]) => void;
  removeImage: (imageId: string) => void;
  setCurrentImage: (imageId: string) => void;
  setPreviewImage: (imageData: string) => void;
  setProcessedImage: (imageData: string) => void;
  updateAdjustments: (updates: Partial<ImageAdjustments>) => void;
  updateCrop: (updates: Partial<CropState>) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  setLoading: (loading: boolean) => void;
  clearAll: () => void; // Clear all data and go back to home
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
  whiteBalance: 0,
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
  aspectRatio: 1,
  sourceWidth: 0,
  sourceHeight: 0,
};

// Cached default values to avoid creating new objects on every selector call
const CACHED_DEFAULT_ADJUSTMENTS = Object.freeze({ ...DEFAULT_ADJUSTMENTS });
const CACHED_DEFAULT_CROP = Object.freeze({ ...DEFAULT_CROP });
const CACHED_EMPTY_HISTORY_ARRAY = Object.freeze([]);
const CACHED_EMPTY_HISTORY = Object.freeze({ history: CACHED_EMPTY_HISTORY_ARRAY, historyIndex: -1 });

// Helper to check if we're on the client side
const isClient = typeof window !== 'undefined';

// Helper to generate a UUID for image IDs
const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Type for the persisted state (without functions)
type PersistedState = {
  images: ImageData[];
  currentImageId: string | null;
  // Legacy fields for migration
  originalImage?: string | null;
  previewImage?: string | null;
  processedImage?: string | null;
  adjustments?: ImageAdjustments;
  crop?: CropState;
  history?: { adjustments: ImageAdjustments; crop: CropState }[];
  historyIndex?: number;
};

// Type for metadata-only persisted state (images stored in IndexedDB)
type PersistedMetadata = {
  imageMetadata: Array<{
    id: string;
    adjustments: ImageAdjustments;
    crop: CropState;
    history: { adjustments: ImageAdjustments; crop: CropState }[];
    historyIndex: number;
  }>;
  currentImageId: string | null;
  storageVersion: number; // Track storage format version for migrations
};

// Custom storage that uses IndexedDB for images and localStorage for settings
const createHybridStorage = (): PersistStorage<PersistedState> => {
  if (!isClient) {
    // Return no-op storage for SSR
    return {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
    };
  }

  const SETTINGS_KEY = 'luma-forge-editor-settings';
  const STORAGE_VERSION = 2; // Increment when storage format changes

  return {
    getItem: async () => {
      try {
        // Get metadata from localStorage
        const settingsStr = localStorage.getItem(SETTINGS_KEY);
        if (!settingsStr) {
          return null;
        }

        const settings = JSON.parse(settingsStr);
        const metadata = settings.state as PersistedMetadata | PersistedState;

        // Check if this is the new format with IndexedDB (storageVersion === 2)
        if (metadata && 'storageVersion' in metadata && metadata.storageVersion === STORAGE_VERSION) {
          // New format - images in IndexedDB, metadata in localStorage
          const imageMetadata = metadata.imageMetadata || [];
          const images: ImageData[] = [];

          // Load images from IndexedDB
          for (const meta of imageMetadata) {
            const blobs = await getImageBlobs(meta.id);
            images.push({
              id: meta.id,
              originalImage: blobs.originalImage || '',
              previewImage: blobs.previewImage,
              processedImage: blobs.processedImage,
              adjustments: meta.adjustments || { ...DEFAULT_ADJUSTMENTS },
              crop: meta.crop || { ...DEFAULT_CROP },
              history: meta.history || [],
              historyIndex: meta.historyIndex ?? -1,
            });
          }

          return {
            state: {
              images,
              currentImageId: metadata.currentImageId || null,
            },
            version: settings.version || 0,
          };
        }

        // Legacy format - migrate from localStorage-only storage
        const state = metadata as PersistedState;

        if (state.images && Array.isArray(state.images)) {
          // Old format with images in localStorage - migrate to IndexedDB
          const migratedImages: ImageData[] = [];

          for (const img of state.images) {
            // Store images in IndexedDB
            await storeImageBlobs(
              img.id,
              img.originalImage || null,
              img.previewImage || null,
              img.processedImage || null
            );

            migratedImages.push(img);
          }

          // Save metadata only to localStorage
          const metadataOnly: PersistedMetadata = {
            imageMetadata: migratedImages.map(img => ({
              id: img.id,
              adjustments: img.adjustments,
              crop: img.crop,
              history: img.history || [],
              historyIndex: img.historyIndex ?? -1,
            })),
            currentImageId: state.currentImageId || null,
            storageVersion: STORAGE_VERSION,
          };

          try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
              state: metadataOnly,
              version: settings.version || 0,
            }));
          } catch (error) {
            console.error('Failed to save migrated metadata:', error);
          }

          return {
            state: {
              images: migratedImages,
              currentImageId: state.currentImageId || null,
            },
            version: settings.version || 0,
          };
        }

        return null;
      } catch (error) {
        console.error('Error getting from hybrid storage:', error);
        return null;
      }
    },

    setItem: async (_name: string, value) => {
      try {
        void _name;
        const state = (value as { state: PersistedState; version?: number }).state;
        const version = (value as { version?: number }).version || 0;

        if (!state.images || state.images.length === 0) {
          // No images to save - just save metadata
          const metadataOnly: PersistedMetadata = {
            imageMetadata: [],
            currentImageId: null,
            storageVersion: STORAGE_VERSION,
          };

          localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            state: metadataOnly,
            version: version,
          }));

          // Clear IndexedDB
          await clearAllImageBlobs();
          return;
        }

        // Extract metadata (without image data)
        const imageMetadata = state.images.map(img => ({
          id: img.id,
          adjustments: img.adjustments,
          crop: img.crop,
          history: img.history || [],
          historyIndex: img.historyIndex ?? -1,
        }));

        // Save metadata to localStorage (small size)
        const metadataOnly: PersistedMetadata = {
          imageMetadata,
          currentImageId: state.currentImageId || null,
          storageVersion: STORAGE_VERSION,
        };

        // Store images in IndexedDB and metadata in localStorage
        const storagePromises = state.images.map(img =>
          storeImageBlobs(
            img.id,
            img.originalImage || null,
            img.previewImage || null,
            img.processedImage || null
          )
        );

        // Save metadata to localStorage (should be small now)
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          state: metadataOnly,
          version: version,
        }));

        // Store all images in IndexedDB
        await Promise.all(storagePromises);

      } catch (error) {
        console.error('Error setting hybrid storage:', error);
        // If localStorage is still full (shouldn't happen with metadata only), try to clear old data
        if (error instanceof Error && (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceededError'))) {
          console.warn('localStorage is full. Attempting to clear old data.');
          try {
            // Clear old format data if it exists
            localStorage.removeItem('luma-forge-editor-storage');
            // Retry with just current data
            const state = (value as { state: PersistedState; version?: number }).state;
            if (state.images && state.images.length > 0) {
              const imageMetadata = state.images.map(img => ({
                id: img.id,
                adjustments: img.adjustments,
                crop: img.crop,
                history: img.history || [],
                historyIndex: img.historyIndex ?? -1,
              }));
              const metadataOnly: PersistedMetadata = {
                imageMetadata,
                currentImageId: state.currentImageId || null,
                storageVersion: STORAGE_VERSION,
              };
              localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                state: metadataOnly,
                version: (value as { version?: number }).version || 0,
              }));
            }
          } catch (retryError) {
            console.error('Failed to recover from storage error:', retryError);
          }
        }
      }
    },

    removeItem: async (_name: string): Promise<void> => {
      try {
        void _name;
        localStorage.removeItem(SETTINGS_KEY);
        await clearAllImageBlobs();
      } catch (error) {
        console.error('Error removing from hybrid storage:', error);
      }
    },
  };
};

// Helper to create a new image data object
const createImageData = (imageData: string): ImageData => ({
  id: generateId(),
  originalImage: imageData,
  previewImage: null,
  processedImage: imageData,
  adjustments: {
    ...DEFAULT_ADJUSTMENTS,
    curves: JSON.parse(JSON.stringify(DEFAULT_CURVES))
  },
  crop: { ...DEFAULT_CROP },
  history: [],
  historyIndex: -1,
});

// Helper to get current image
const getCurrentImage = (state: EditorState): ImageData | null => {
  if (!state.currentImageId) return null;
  return state.images.find(img => img.id === state.currentImageId) || null;
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      images: [],
      currentImageId: null,
      isLoading: true,

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setImage: (imageData) => {
        const newImage = createImageData(imageData);
        set({
          images: [newImage],
          currentImageId: newImage.id,
        });
      },

      addImage: (imageData) => {
        const newImage = createImageData(imageData);
        set((state) => ({
          images: [...state.images, newImage],
          currentImageId: newImage.id,
        }));
      },

      addImages: (imageDataArray) => {
        if (!imageDataArray || imageDataArray.length === 0) return;

        set((state) => {
          const newImages = imageDataArray.map((data) => createImageData(data));
          const updatedImages = [...state.images, ...newImages];
          console.log('updatedImages', updatedImages)
          const lastImage = newImages[newImages.length - 1];

          return {
            images: updatedImages,
            currentImageId: lastImage.id,
          };
        });
      },

      removeImage: (imageId) => {
        set((state) => {
          const newImages = state.images.filter(img => img.id !== imageId);
          let newCurrentId = state.currentImageId;

          // If we're removing the current image, switch to another one
          if (state.currentImageId === imageId) {
            newCurrentId = newImages.length > 0 ? newImages[0].id : null;
          }

          return {
            images: newImages,
            currentImageId: newCurrentId,
          };
        });
      },

      setCurrentImage: (imageId) => {
        set({ currentImageId: imageId });
      },

      setPreviewImage: (imageData) => {
        const state = get();
        if (!state.currentImageId) return;

        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? { ...img, previewImage: imageData }
              : img
          ),
        });
      },

      setProcessedImage: (imageData) => {
        const state = get();
        if (!state.currentImageId) return;

        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? { ...img, processedImage: imageData }
              : img
          ),
        });
      },

      updateAdjustments: (updates) => {
        const state = get();
        if (!state.currentImageId) return;

        const current = getCurrentImage(state);
        if (!current) return;

        const newAdjustments = { ...current.adjustments, ...updates };
        const newHistory = current.history.slice(0, current.historyIndex + 1);
        newHistory.push({ adjustments: current.adjustments, crop: current.crop });

        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? {
                ...img,
                adjustments: newAdjustments,
                history: newHistory,
                historyIndex: newHistory.length - 1,
              }
              : img
          ),
        });
      },

      updateCrop: (updates) => {
        const state = get();
        if (!state.currentImageId) return;

        const current = getCurrentImage(state);
        if (!current) return;

        const newCrop = { ...current.crop, ...updates };
        const newHistory = current.history.slice(0, current.historyIndex + 1);
        newHistory.push({ adjustments: current.adjustments, crop: current.crop });

        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? {
                ...img,
                crop: newCrop,
                history: newHistory,
                historyIndex: newHistory.length - 1,
              }
              : img
          ),
        });
      },

      undo: () => {
        const state = get();
        if (!state.currentImageId) return;

        const current = getCurrentImage(state);
        if (!current || current.historyIndex < 0) return;

        const previousState = current.history[current.historyIndex];
        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? {
                ...img,
                adjustments: previousState.adjustments,
                crop: previousState.crop,
                historyIndex: current.historyIndex - 1,
              }
              : img
          ),
        });
      },

      redo: () => {
        const state = get();
        if (!state.currentImageId) return;

        const current = getCurrentImage(state);
        if (!current || current.historyIndex >= current.history.length - 1) return;

        const nextState = current.history[current.historyIndex + 1];
        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? {
                ...img,
                adjustments: nextState.adjustments,
                crop: nextState.crop,
                historyIndex: current.historyIndex + 1,
              }
              : img
          ),
        });
      },

      reset: () => {
        const state = get();
        if (!state.currentImageId) return;

        set({
          images: state.images.map(img =>
            img.id === state.currentImageId
              ? {
                ...img,
                adjustments: {
                  ...DEFAULT_ADJUSTMENTS,
                  curves: JSON.parse(JSON.stringify(DEFAULT_CURVES))
                },
                crop: { ...DEFAULT_CROP },
                history: [],
                historyIndex: -1,
              }
              : img
          ),
        });
      },

      clearAll: () => {
        set({
          images: [],
          currentImageId: null,
        });
      }
    }),
    {
      name: 'luma-forge-editor-storage', // unique name for storage key
      storage: createHybridStorage(),
      // Persist metadata (adjustments, crop, history) to localStorage
      // Images are stored in IndexedDB to avoid localStorage quota limits
      partialize: (state) => ({
        images: state.images,
        currentImageId: state.currentImageId,
      }),
      // Handle errors gracefully and manage loading state
      onRehydrateStorage: () => {
        return (state, error) => {
          // Set loading to false when hydration completes (success or error)
          if (isClient) {
            setTimeout(() => {
              useEditorStore.getState().setLoading(false);
            }, 0);
          }

          if (error) {
            console.error('Failed to rehydrate store from storage:', error);
            // If localStorage is full, try to clear old data
            const errorObj = error as Error;
            if (errorObj.message?.includes('QuotaExceededError') || errorObj.name === 'QuotaExceededError') {
              console.warn('localStorage is full. Consider using IndexedDB for larger images.');
              try {
                localStorage.removeItem('luma-forge-editor-storage');
              } catch (e) {
                console.error('Failed to clear localStorage:', e);
              }
            }
          } else if (state && isClient) {
            const imageCount = state.images?.length || 0;
            const currentImage = state.currentImageId
              ? state.images?.find(img => img.id === state.currentImageId)
              : null;
            console.log('Store rehydrated successfully:', {
              imageCount,
              hasCurrentImage: !!currentImage,
              currentImageId: state.currentImageId,
              totalImagesSize: state.images?.reduce((sum, img) =>
                sum + (img.originalImage?.length || 0), 0) || 0,
            });
          }
        };
      },
    }
  )
);

// Selector hooks for backward compatibility
export const useCurrentImage = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return null;
    return state.images.find(img => img.id === state.currentImageId) || null;
  });
};

export const useOriginalImage = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return null;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.originalImage || null;
  });
};

export const usePreviewImage = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return null;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.previewImage || null;
  });
};

export const useProcessedImage = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return null;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.processedImage || null;
  });
};

export const useAdjustments = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return CACHED_DEFAULT_ADJUSTMENTS;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.adjustments || CACHED_DEFAULT_ADJUSTMENTS;
  });
};

export const useCrop = () => {
  return useEditorStore((state) => {
    if (!state.currentImageId) return CACHED_DEFAULT_CROP;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.crop || CACHED_DEFAULT_CROP;
  });
};

export const useHistory = () => {
  const history = useEditorStore((state) => {
    if (!state.currentImageId) return CACHED_EMPTY_HISTORY_ARRAY;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.history || CACHED_EMPTY_HISTORY_ARRAY;
  });

  const historyIndex = useEditorStore((state) => {
    if (!state.currentImageId) return -1;
    const current = state.images.find(img => img.id === state.currentImageId);
    return current?.historyIndex ?? -1;
  });

  return useMemo(() => {
    if (history === CACHED_EMPTY_HISTORY_ARRAY && historyIndex === -1) {
      return CACHED_EMPTY_HISTORY;
    }
    return {
      history,
      historyIndex,
    };
  }, [history, historyIndex]);
};
