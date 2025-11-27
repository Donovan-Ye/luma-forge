import { ImageAdjustments, Curves, Point } from '@/lib/store';

/**
 * Clamps a value between 0 and 255
 */
const clamp = (value: number) => Math.max(0, Math.min(255, value));

function createLUT(points: Point[]): Uint8Array {
    const lut = new Uint8Array(256);
    // Sort points by x
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    // Linear interpolation between points
    for (let i = 0; i < 256; i++) {
        const x = i / 255;
        
        // Find segment
        let p0 = sorted[0];
        let p1 = sorted[sorted.length - 1];
        
        for (let j = 0; j < sorted.length - 1; j++) {
            if (x >= sorted[j].x && x <= sorted[j+1].x) {
                p0 = sorted[j];
                p1 = sorted[j+1];
                break;
            }
        }
        
        // Interpolate
        const range = p1.x - p0.x;
        const t = range === 0 ? 0 : (x - p0.x) / range;
        const y = p0.y + t * (p1.y - p0.y);
        
        lut[i] = clamp(Math.round(y * 255));
    }
    return lut;
}

export function applyCurves(data: Uint8ClampedArray, curves: Curves) {
    if (!curves) return;
    
    const masterLUT = createLUT(curves.master);
    const redLUT = createLUT(curves.red);
    const greenLUT = createLUT(curves.green);
    const blueLUT = createLUT(curves.blue);

    for (let i = 0; i < data.length; i += 4) {
        // Apply Channel Curves
        data[i] = redLUT[data[i]];
        data[i+1] = greenLUT[data[i+1]];
        data[i+2] = blueLUT[data[i+2]];
        
        // Apply Master Curve
        data[i] = masterLUT[data[i]];
        data[i+1] = masterLUT[data[i+1]];
        data[i+2] = masterLUT[data[i+2]];
    }
}

/**
 * Applies adjustments to image data using a single pass for color/exposure operations.
 * Note: Spatial operations like Blur and Sharpen need to be handled separately/after.
 */
export function applyColorAdjustments(
  data: Uint8ClampedArray, 
  adjustments: ImageAdjustments
) {
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

  // Pre-calculate constants
  const exposureMultiplier = Math.pow(2, exposure / 100);
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  // Saturation constants
  const satMult = 1 + saturation / 100;
  const rw = 0.3086, rg = 0.6094, rb = 0.0820;

  // Temperature/Tint adjustment matrices
  const temp = temperature / 100;
  const rTemp = temp > 0 ? 1 + temp * 0.4 : 1;
  const bTemp = temp < 0 ? 1 - temp * 0.4 : 1;
  
  const tnt = tint / 100;
  const gTint = 1 + tnt * 0.2;


  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Exposure
    r *= exposureMultiplier;
    g *= exposureMultiplier;
    b *= exposureMultiplier;

    // 2. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 3. Temperature & Tint
    r *= rTemp;
    g *= gTint;
    b *= bTemp;

    // 4. Saturation
    const gray = r * rw + g * rg + b * rb;
    
    r = gray + (r - gray) * satMult;
    g = gray + (g - gray) * satMult;
    b = gray + (b - gray) * satMult;

    // 5. White Balance (adjusts blue/yellow balance)
    if (whiteBalance !== 0) {
      const wbFactor = whiteBalance / 100;
      // Positive values add blue (cooler), negative values add yellow (warmer)
      // Adjust blue channel inversely to temperature
      b *= (1 + wbFactor * 0.3);
      r *= (1 - wbFactor * 0.15);
      g *= (1 - wbFactor * 0.1);
    }

    // 6. Highlights / Shadows (Simple Tone Mapping)
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

export function applyConvolution(
    imageData: ImageData,
    kernel: number[],
    opaque: boolean = true
): ImageData {
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
