import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';

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
  originalImage: string | null; // Data URL (Full Resolution)
  previewImage: string | null; // Data URL (Low Resolution for editing)
  processedImage: string | null; // Data URL for result preview

  adjustments: ImageAdjustments;
  crop: CropState;

  history: { adjustments: ImageAdjustments; crop: CropState }[];
  historyIndex: number;
  isLoading: boolean; // Loading state for IndexedDB operations

  setImage: (imageData: string) => void;
  setPreviewImage: (imageData: string) => void;
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

// Helper to check if we're on the client side
const isClient = typeof window !== 'undefined';

// Type for the persisted state (without functions)
type PersistedState = {
  adjustments: ImageAdjustments;
  crop: CropState;
  originalImage: string | null;
  previewImage: string | null;
  processedImage: string | null;
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

  const DB_NAME = 'luma-forge-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';
  const SETTINGS_KEY = 'luma-forge-editor-settings';

  // Initialize IndexedDB
  const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  };

  return {
    getItem: async (name: string) => {
      try {
        // Get settings from localStorage
        const settingsStr = localStorage.getItem(SETTINGS_KEY);
        if (!settingsStr) {
          return null;
        }

        const settings = JSON.parse(settingsStr);

        // Get images from IndexedDB
        const db = await initDB();
        const imageKeys = ['originalImage', 'previewImage', 'processedImage'];
        const images: Record<string, string | null> = {};

        for (const key of imageKeys) {
          try {
            const value = await new Promise<string | null>((resolve, reject) => {
              const transaction = db.transaction([STORE_NAME], 'readonly');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.get(`${name}-${key}`);
              request.onsuccess = () => resolve(request.result || null);
              request.onerror = () => reject(request.error);
            });
            images[key] = value;
          } catch (e) {
            console.warn(`Failed to get ${key} from IndexedDB:`, e);
            images[key] = null;
          }
        }

        db.close();

        // Merge settings and images
        const mergedState: PersistedState = {
          ...settings.state,
          ...images,
        } as PersistedState;

        return {
          state: mergedState,
          version: settings.version || 0,
        };
      } catch (error) {
        console.error('Error getting from hybrid storage:', error);
        return null;
      }
    },

    setItem: async (name: string, value) => {
      try {
        const state = (value as { state: PersistedState; version?: number }).state;

        // Separate images from settings
        const { originalImage, previewImage, processedImage, ...settings } = state;

        // Save settings to localStorage
        const version = (value as { version?: number }).version || 0;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          state: settings,
          version: version,
        }));

        // Save images to IndexedDB
        const db = await initDB();
        const imageData = [
          { key: 'originalImage', value: originalImage },
          { key: 'previewImage', value: previewImage },
          { key: 'processedImage', value: processedImage },
        ];

        for (const { key, value: imageValue } of imageData) {
          try {
            await new Promise<void>((resolve, reject) => {
              const transaction = db.transaction([STORE_NAME], 'readwrite');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.put(imageValue, `${name}-${key}`);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          } catch (e) {
            console.warn(`Failed to save ${key} to IndexedDB:`, e);
          }
        }

        db.close();
      } catch (error) {
        console.error('Error setting hybrid storage:', error);
        // Fallback: try to save without images if IndexedDB fails
        try {
          const state = (value as { state: PersistedState; version?: number }).state;
          const { originalImage, previewImage, processedImage, ...settings } = state;
          const version = (value as { version?: number }).version || 0;
          localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            state: settings,
            version: version,
          }));
        } catch (e) {
          console.error('Failed to save settings as fallback:', e);
        }
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        localStorage.removeItem(SETTINGS_KEY);
        const db = await initDB();
        const imageKeys = ['originalImage', 'previewImage', 'processedImage'];
        for (const key of imageKeys) {
          try {
            await new Promise<void>((resolve, reject) => {
              const transaction = db.transaction([STORE_NAME], 'readwrite');
              const store = transaction.objectStore(STORE_NAME);
              const request = store.delete(`${name}-${key}`);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          } catch (e) {
            console.warn(`Failed to delete ${key} from IndexedDB:`, e);
          }
        }
        db.close();
      } catch (error) {
        console.error('Error removing from hybrid storage:', error);
      }
    },
  };
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      originalImage: null,
      previewImage: null,
      processedImage: null,

      adjustments: { ...DEFAULT_ADJUSTMENTS },
      crop: { ...DEFAULT_CROP },

      history: [],
      historyIndex: -1,
      isLoading: true, // Start with loading true for initial hydration

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setImage: (imageData) => {
        set({
          originalImage: imageData,
          previewImage: null, // Will be set by UI
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

      setPreviewImage: (imageData) => {
        set({ previewImage: imageData });
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
      },

      clearAll: () => {
        set({
          originalImage: null,
          previewImage: null,
          processedImage: null,
          adjustments: {
            ...DEFAULT_ADJUSTMENTS,
            curves: JSON.parse(JSON.stringify(DEFAULT_CURVES))
          },
          crop: { ...DEFAULT_CROP },
          history: [],
          historyIndex: -1,
        });
      }
    }),
    {
      name: 'luma-forge-editor-storage', // unique name for storage key
      storage: createHybridStorage(),
      // Persist adjustments, crop, and images
      // Note: Images are stored as data URLs which can be large
      // If you hit localStorage size limits, consider using IndexedDB instead
      partialize: (state) => ({
        adjustments: state.adjustments,
        crop: state.crop,
        originalImage: state.originalImage,
        previewImage: state.previewImage,
        processedImage: state.processedImage,
        // Exclude: history, historyIndex (not needed across sessions)
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
            console.log('Store rehydrated successfully:', {
              hasOriginalImage: !!state.originalImage,
              hasPreviewImage: !!state.previewImage,
              hasProcessedImage: !!state.processedImage,
              originalImageSize: state.originalImage ? state.originalImage.length : 0,
            });
          }
        };
      },
    }
  )
);
