type FileSystemWritableLike = {
  write: (data: Blob | BufferSource | string) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandleLike = {
  createWritable: () => Promise<FileSystemWritableLike>;
};

type SaveFilePickerFn = (options?: {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FileSystemFileHandleLike>;

export type DownloadOptions = {
  filename: string;
  description: string;
  accept: Record<string, string[]>;
};

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function triggerAnchorDownload(blob: Blob, filename: string) {
  return new Promise<void>((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(clickEvent);

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(objectUrl);
      resolve();
    }, 1000);
  });
}

export async function downloadBlob(blob: Blob, options: DownloadOptions) {
  const savePicker = (window as Window & { showSaveFilePicker?: SaveFilePickerFn }).showSaveFilePicker;

  if (savePicker) {
    try {
      const handle = await savePicker({
        suggestedName: options.filename,
        types: [
          {
            description: options.description,
            accept: options.accept,
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled the picker; do not attempt a fallback download.
        return;
      }
      console.warn('Save picker failed, falling back to anchor download', error);
    }
  }

  await triggerAnchorDownload(blob, options.filename);
}


