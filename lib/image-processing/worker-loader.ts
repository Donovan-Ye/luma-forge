/**
 * Creates and manages the image processing Web Worker
 */

let workerInstance: Worker | null = null;
let workerReady = false;

export function getImageWorker(): Worker {
  if (workerInstance && workerReady) {
    return workerInstance;
  }

  // Create worker from inline code (as a blob URL)
  const workerCode = `
    const clamp = (value) => Math.max(0, Math.min(255, value));

    function createLUT(points) {
      const lut = new Uint8Array(256);
      const sorted = [...points].sort((a, b) => a.x - b.x);

      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        let p0 = sorted[0];
        let p1 = sorted[sorted.length - 1];

        for (let j = 0; j < sorted.length - 1; j++) {
          if (x >= sorted[j].x && x <= sorted[j + 1].x) {
            p0 = sorted[j];
            p1 = sorted[j + 1];
            break;
          }
        }

        const range = p1.x - p0.x;
        const t = range === 0 ? 0 : (x - p0.x) / range;
        const y = p0.y + t * (p1.y - p0.y);
        lut[i] = clamp(Math.round(y * 255));
      }
      return lut;
    }

    function applyCurves(data, curves) {
      if (!curves) return;

      const masterLUT = createLUT(curves.master);
      const redLUT = createLUT(curves.red);
      const greenLUT = createLUT(curves.green);
      const blueLUT = createLUT(curves.blue);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = redLUT[data[i]];
        data[i + 1] = greenLUT[data[i + 1]];
        data[i + 2] = blueLUT[data[i + 2]];

        data[i] = masterLUT[data[i]];
        data[i + 1] = masterLUT[data[i + 1]];
        data[i + 2] = masterLUT[data[i + 2]];
      }
    }

    function applyColorAdjustments(data, adjustments) {
      const {
        exposure,
        contrast,
        saturation,
        temperature,
        tint,
        highlights,
        shadows,
        whiteBalance,
      } = adjustments;

      const exposureMultiplier = Math.pow(2, exposure / 100);
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const satMult = 1 + saturation / 100;
      const rw = 0.3086, rg = 0.6094, rb = 0.0820;

      const temp = temperature / 100;
      const rTemp = temp > 0 ? 1 + temp * 0.4 : 1;
      const bTemp = temp < 0 ? 1 - temp * 0.4 : 1;

      const tnt = tint / 100;
      const gTint = 1 + tnt * 0.2;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r *= exposureMultiplier;
        g *= exposureMultiplier;
        b *= exposureMultiplier;

        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        r *= rTemp;
        g *= gTint;
        b *= bTemp;

        const gray = r * rw + g * rg + b * rb;
        r = gray + (r - gray) * satMult;
        g = gray + (g - gray) * satMult;
        b = gray + (b - gray) * satMult;

        if (whiteBalance !== 0) {
          const wbFactor = whiteBalance / 100;
          b *= (1 + wbFactor * 0.3);
          r *= (1 - wbFactor * 0.15);
          g *= (1 - wbFactor * 0.1);
        }

        const lum = (r + g + b) / 3;
        if (highlights !== 0 || shadows !== 0) {
          if (lum > 128 && highlights !== 0) {
            const factor = 1 + (highlights / 200) * ((lum - 128) / 128);
            r *= factor;
            g *= factor;
            b *= factor;
          }
          if (lum < 128 && shadows !== 0) {
            const factor = 1 + (shadows / 200) * ((128 - lum) / 128);
            r *= factor;
            g *= factor;
            b *= factor;
          }
        }

        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
      }
    }

    function applyConvolution(imageData, kernel, opaque = true) {
      const side = Math.round(Math.sqrt(kernel.length));
      const halfSide = Math.floor(side / 2);
      const src = imageData.data;
      const w = imageData.width;
      const h = imageData.height;

      const output = new ImageData(w, h);
      const dst = output.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, a = 0;
          const dstOff = (y * w + x) * 4;

          for (let cy = 0; cy < side; cy++) {
            for (let cx = 0; cx < side; cx++) {
              const scy = y + cy - halfSide;
              const scx = x + cx - halfSide;

              if (scy >= 0 && scy < h && scx >= 0 && scx < w) {
                const srcOff = (scy * w + scx) * 4;
                const wt = kernel[cy * side + cx];

                r += src[srcOff] * wt;
                g += src[srcOff + 1] * wt;
                b += src[srcOff + 2] * wt;
                a += src[srcOff + 3] * wt;
              }
            }
          }

          dst[dstOff] = clamp(r);
          dst[dstOff + 1] = clamp(g);
          dst[dstOff + 2] = clamp(b);
          dst[dstOff + 3] = opaque ? 255 : clamp(a);
        }
      }
      return output;
    }

    self.onmessage = function(e) {
      const { imageData, adjustments } = e.data;

      try {
        const data = new Uint8ClampedArray(imageData.data);
        const width = imageData.width;
        const height = imageData.height;
        const processedImageData = new ImageData(data, width, height);

        applyColorAdjustments(processedImageData.data, adjustments);

        if (adjustments.curves) {
          applyCurves(processedImageData.data, adjustments.curves);
        }

        let finalImageData = processedImageData;
        if (adjustments.blur > 0) {
          const val = 1/9;
          const kernel = [
            val, val, val,
            val, val, val,
            val, val, val
          ];
          finalImageData = applyConvolution(finalImageData, kernel);
        }

        if (adjustments.sharpness > 0) {
          const s = adjustments.sharpness / 100;
          const kernel = [
            0, -1 * s, 0,
            -1 * s, 1 + 4 * s, -1 * s,
            0, -1 * s, 0
          ];
          finalImageData = applyConvolution(finalImageData, kernel);
        }

        self.postMessage({
          success: true,
          imageData: {
            data: finalImageData.data.buffer,
            width: finalImageData.width,
            height: finalImageData.height
          }
        }, [finalImageData.data.buffer]);
      } catch (error) {
        self.postMessage({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  workerInstance = new Worker(workerUrl);
  workerReady = true;

  return workerInstance;
}

export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
  }
}

