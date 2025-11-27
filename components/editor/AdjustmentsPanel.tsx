'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditorStore, ImageAdjustments, Point } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Sun, Spline, Sparkles, Aperture, RotateCcw, Droplet } from 'lucide-react';
import { CurveEditor } from './CurveEditor';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

export function AdjustmentsPanel() {
  const { adjustments, updateAdjustments } = useEditorStore();
  const [activeCurve, setActiveCurve] = useState<'master' | 'red' | 'green' | 'blue'>('master');

  const handleChange = (key: keyof ImageAdjustments) => (value: number[]) => {
    updateAdjustments({ [key]: value[0] });
  };

  const handleCurveChange = (points: Point[]) => {
    updateAdjustments({
      curves: {
        ...adjustments.curves,
        [activeCurve]: points
      }
    });
  };

  const curveColors = {
    master: 'currentColor',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6'
  };

  // Reset handlers for each section
  const resetLight = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    updateAdjustments({
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
    });
  };

  const resetWhiteBalance = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    updateAdjustments({
      temperature: 0,
      tint: 0,
      whiteBalance: 0,
    });
  };

  const resetColor = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    updateAdjustments({
      saturation: 0,
    });
  };

  const resetDetail = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    updateAdjustments({
      sharpness: 0,
      blur: 0,
    });
  };

  const resetCurves = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    const defaultCurves = {
      master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    };
    updateAdjustments({
      curves: defaultCurves,
    });
  };

  return (
    <div className="w-full h-full">
      <Accordion type="multiple" defaultValue={["light", "whiteBalance", "color", "detail"]} className="w-full">

        {/* Light Section */}
        <AccordionItem value="light">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-muted-foreground" />
                <span>Light</span>
              </div>
              <button
                onClick={resetLight}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                title="Reset Light adjustments"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-6">
            <AdjustmentSlider
              label="Exposure"
              value={adjustments.exposure}
              onChange={handleChange('exposure')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Contrast"
              value={adjustments.contrast}
              onChange={handleChange('contrast')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Highlights"
              value={adjustments.highlights}
              onChange={handleChange('highlights')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Shadows"
              value={adjustments.shadows}
              onChange={handleChange('shadows')}
              min={-100}
              max={100}
            />
          </AccordionContent>
        </AccordionItem>

        {/* White Balance Section */}
        <AccordionItem value="whiteBalance">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-muted-foreground" />
                <span>White Balance</span>
              </div>
              <button
                onClick={resetWhiteBalance}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                title="Reset White Balance adjustments"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-6">
            <AdjustmentSlider
              label="Temperature"
              value={adjustments.temperature}
              onChange={handleChange('temperature')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Tint"
              value={adjustments.tint}
              onChange={handleChange('tint')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="White Balance"
              value={adjustments.whiteBalance}
              onChange={handleChange('whiteBalance')}
              min={-100}
              max={100}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Color Section */}
        <AccordionItem value="color">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Aperture className="w-4 h-4 text-muted-foreground" />
                <span>Color</span>
              </div>
              <button
                onClick={resetColor}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                title="Reset Color adjustments"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-6">
            <AdjustmentSlider
              label="Saturation"
              value={adjustments.saturation}
              onChange={handleChange('saturation')}
              min={-100}
              max={100}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Detail Section */}
        <AccordionItem value="detail">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span>Detail</span>
              </div>
              <button
                onClick={resetDetail}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                title="Reset Detail adjustments"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-6">
            <AdjustmentSlider
              label="Sharpness"
              value={adjustments.sharpness}
              onChange={handleChange('sharpness')}
              min={0}
              max={100}
            />
            <AdjustmentSlider
              label="Blur"
              value={adjustments.blur}
              onChange={handleChange('blur')}
              min={0}
              max={100}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Curves Section */}
        <AccordionItem value="curves">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                <Spline className="w-4 h-4 text-muted-foreground" />
                <span>Curves</span>
              </div>
              <button
                onClick={resetCurves}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-accent transition-colors"
                title="Reset Curves"
              >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-4">
            {/* Channel Selector Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveCurve('master')}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  activeCurve === 'master'
                    ? "border-foreground bg-foreground/10 scale-110"
                    : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50"
                )}
                title="Master (RGB)"
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white via-gray-400 to-black" />
              </button>
              <button
                onClick={() => setActiveCurve('red')}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  activeCurve === 'red'
                    ? "border-red-500 bg-red-500/10 scale-110"
                    : "border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
                )}
                title="Red Channel"
              >
                <div className="w-4 h-4 rounded-full bg-red-500" />
              </button>
              <button
                onClick={() => setActiveCurve('green')}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  activeCurve === 'green'
                    ? "border-green-500 bg-green-500/10 scale-110"
                    : "border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10"
                )}
                title="Green Channel"
              >
                <div className="w-4 h-4 rounded-full bg-green-500" />
              </button>
              <button
                onClick={() => setActiveCurve('blue')}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                  activeCurve === 'blue'
                    ? "border-blue-500 bg-blue-500/10 scale-110"
                    : "border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
                )}
                title="Blue Channel"
              >
                <div className="w-4 h-4 rounded-full bg-blue-500" />
              </button>
            </div>

            <div className="pt-2 pb-2">
              {adjustments.curves && (
                <CurveEditor
                  points={adjustments.curves[activeCurve]}
                  onChange={handleCurveChange}
                  color={curveColors[activeCurve]}
                  channel={activeCurve}
                />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

interface AdjustmentSliderProps {
  label: string;
  value: number;
  onChange: (value: number[]) => void;
  min: number;
  max: number;
}

function AdjustmentSlider({ label, value, onChange, min, max }: AdjustmentSliderProps) {
  // Local state for smooth dragging
  const [localValue, setLocalValue] = useState(value);
  const isDraggingRef = useRef(false);

  // Sync local value when prop value changes (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      // Defer state update to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        if (!isDraggingRef.current) {
          setLocalValue(value);
        }
      });
    }
  }, [value]);

  // Create debounced function using lodash
  const debouncedUpdate = useMemo(
    () => debounce((newValue: number) => {
      onChange([newValue]);
    }, 50), // 50ms debounce for smooth updates
    [onChange]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  const handleValueChange = useCallback((newValue: number[]) => {
    const val = newValue[0];
    setLocalValue(val); // Update local state immediately for smooth UI
    debouncedUpdate(val); // Debounced update to store
  }, [debouncedUpdate]);

  const handleValueCommit = useCallback(() => {
    // Cancel any pending debounced update and flush immediately
    debouncedUpdate.cancel();
    // Immediately commit the current value
    onChange([localValue]);
    isDraggingRef.current = false;
  }, [localValue, onChange, debouncedUpdate]);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Handle pointer up globally to catch when dragging ends
  useEffect(() => {
    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        handleValueCommit();
      }
    };

    document.addEventListener('pointerup', handlePointerUp);
    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handleValueCommit]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
          {localValue}
        </span>
      </div>
      <div onPointerDown={handlePointerDown}>
        <Slider
          value={[localValue]}
          onValueChange={handleValueChange}
          min={min}
          max={max}
          step={1}
          className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
        />
      </div>
    </div>
  );
}
