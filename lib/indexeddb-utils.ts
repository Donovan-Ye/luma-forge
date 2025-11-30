/**
 * IndexedDB utilities for storing image data
 * This allows us to store large image blobs without hitting localStorage quota limits
 */

const DB_NAME = 'luma-forge-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface ImageBlob {
  id: string;
  originalImage: Blob | null;
  previewImage: Blob | null;
  processedImage: Blob | null;
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('id', 'id', { unique: true });
      }
    };
  });
}

/**
 * Convert data URL to Blob
 */
function dataURLToBlob(dataURL: string): Blob | null {
  if (!dataURL) return null;
  
  try {
    const arr = dataURL.split(',');
    if (arr.length < 2) return null;
    
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Failed to convert data URL to blob:', error);
    return null;
  }
}

/**
 * Convert Blob to data URL
 */
function blobToDataURL(blob: Blob | null): Promise<string | null> {
  if (!blob) return Promise.resolve(null);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string | null);
    };
    reader.onerror = () => {
      reject(new Error('Failed to convert blob to data URL'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Store image blobs in IndexedDB
 */
export async function storeImageBlobs(
  imageId: string,
  originalImage: string | null,
  previewImage: string | null,
  processedImage: string | null
): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    console.warn('IndexedDB not available, skipping image storage');
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const imageBlob: ImageBlob = {
      id: imageId,
      originalImage: originalImage ? dataURLToBlob(originalImage) : null,
      previewImage: previewImage ? dataURLToBlob(previewImage) : null,
      processedImage: processedImage ? dataURLToBlob(processedImage) : null,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(imageBlob);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to store image blobs:', error);
    throw error;
  }
}

/**
 * Retrieve image blobs from IndexedDB
 */
export async function getImageBlobs(
  imageId: string
): Promise<{
  originalImage: string | null;
  previewImage: string | null;
  processedImage: string | null;
}> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    console.warn('IndexedDB not available, returning null');
    return {
      originalImage: null,
      previewImage: null,
      processedImage: null,
    };
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const imageBlob = await new Promise<ImageBlob | undefined>((resolve, reject) => {
      const request = store.get(imageId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!imageBlob) {
      return {
        originalImage: null,
        previewImage: null,
        processedImage: null,
      };
    }

    const [originalImage, previewImage, processedImage] = await Promise.all([
      blobToDataURL(imageBlob.originalImage),
      blobToDataURL(imageBlob.previewImage),
      blobToDataURL(imageBlob.processedImage),
    ]);

    return {
      originalImage,
      previewImage,
      processedImage,
    };
  } catch (error) {
    console.error('Failed to get image blobs:', error);
    return {
      originalImage: null,
      previewImage: null,
      processedImage: null,
    };
  }
}

/**
 * Delete image blobs from IndexedDB
 */
export async function deleteImageBlobs(imageId: string): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(imageId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to delete image blobs:', error);
  }
}

/**
 * Clear all image blobs from IndexedDB
 */
export async function clearAllImageBlobs(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error('Failed to clear all image blobs:', error);
  }
}

/**
 * Get all image IDs stored in IndexedDB
 */
export async function getAllImageIds(): Promise<string[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return [];
  }

  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const ids = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      request.onerror = () => reject(request.error);
    });

    db.close();
    return ids;
  } catch (error) {
    console.error('Failed to get all image IDs:', error);
    return [];
  }
}
