'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdjustments, useEditorStore, ImageAdjustments, Point } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Accordion } from '@/components/ui/accordion';
import { Sun, Spline, Sparkles, Aperture } from 'lucide-react';
import { CurveEditor } from '../widgets/CurveEditor';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';
import { AdjustmentSection } from './AdjustmentSection';
import { useTranslation } from '@/lib/i18n/useTranslation';

export function AdjustmentsPanel() {
  const adjustments = useAdjustments();
  const updateAdjustments = useEditorStore((state) => state.updateAdjustments);
  const [activeCurve, setActiveCurve] = useState<'master' | 'red' | 'green' | 'blue'>('master');
  const { t } = useTranslation();

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

  const resetColor = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    updateAdjustments({
      temperature: 0,
      tint: 0,
      whiteBalance: 0,
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
      <Accordion type="multiple" defaultValue={["light", "color", "detail", "curves"]} className="w-full">

        {/* Light Section */}
        <AdjustmentSection
          value="light"
          icon={Sun}
          title={t('adjustmentsLight')}
          onReset={resetLight}
          resetTitle={t('resetLight')}
        >
          <AdjustmentSlider
            label={t('sliderExposure')}
            value={adjustments.exposure}
            onChange={handleChange('exposure')}
            min={-100}
            max={100}
          />
          <AdjustmentSlider
            label={t('sliderContrast')}
            value={adjustments.contrast}
            onChange={handleChange('contrast')}
            min={-100}
            max={100}
          />
          <AdjustmentSlider
            label={t('sliderHighlights')}
            value={adjustments.highlights}
            onChange={handleChange('highlights')}
            min={-100}
            max={100}
          />
          <AdjustmentSlider
            label={t('sliderShadows')}
            value={adjustments.shadows}
            onChange={handleChange('shadows')}
            min={-100}
            max={100}
          />
        </AdjustmentSection>

        {/* Color Section */}
        <AdjustmentSection
          value="color"
          icon={Aperture}
          title={t('adjustmentsColor')}
          onReset={resetColor}
          resetTitle={t('resetColor')}
        >
          <AdjustmentSlider
            label={t('sliderTemperature')}
            value={adjustments.temperature}
            onChange={handleChange('temperature')}
            min={-100}
            max={100}
            colorGradient="temperature"
          />
          <AdjustmentSlider
            label={t('sliderTint')}
            value={adjustments.tint}
            onChange={handleChange('tint')}
            min={-100}
            max={100}
            colorGradient="tint"
          />
          <AdjustmentSlider
            label={t('sliderWhiteBalance')}
            value={adjustments.whiteBalance}
            onChange={handleChange('whiteBalance')}
            min={-100}
            max={100}
          />
          <AdjustmentSlider
            label={t('sliderSaturation')}
            value={adjustments.saturation}
            onChange={handleChange('saturation')}
            min={-100}
            max={100}
          />
        </AdjustmentSection>

        {/* Detail Section */}
        <AdjustmentSection
          value="detail"
          icon={Sparkles}
          title={t('adjustmentsDetail')}
          onReset={resetDetail}
          resetTitle={t('resetDetail')}
        >
          <AdjustmentSlider
            label={t('sliderSharpness')}
            value={adjustments.sharpness}
            onChange={handleChange('sharpness')}
            min={0}
            max={100}
          />
          <AdjustmentSlider
            label={t('sliderBlur')}
            value={adjustments.blur}
            onChange={handleChange('blur')}
            min={0}
            max={100}
          />
        </AdjustmentSection>

        {/* Curves Section */}
        <AdjustmentSection
          value="curves"
          icon={Spline}
          title={t('adjustmentsCurves')}
          onReset={resetCurves}
          resetTitle={t('resetCurves')}
        >
          <div className="space-y-1.5 pb-4">
            {/* Channel Selector Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveCurve('master')}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                  activeCurve === 'master'
                    ? "border-foreground bg-foreground/10 scale-110"
                    : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50"
                )}
                title="Master (RGB)"
              >
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-white via-gray-400 to-black" />
              </button>
              <button
                onClick={() => setActiveCurve('red')}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                  activeCurve === 'red'
                    ? "border-red-500 bg-red-500/10 scale-110"
                    : "border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
                )}
                title="Red Channel"
              >
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </button>
              <button
                onClick={() => setActiveCurve('green')}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                  activeCurve === 'green'
                    ? "border-green-500 bg-green-500/10 scale-110"
                    : "border-green-500/30 hover:border-green-500/50 hover:bg-green-500/10"
                )}
                title="Green Channel"
              >
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </button>
              <button
                onClick={() => setActiveCurve('blue')}
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                  activeCurve === 'blue'
                    ? "border-blue-500 bg-blue-500/10 scale-110"
                    : "border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
                )}
                title="Blue Channel"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500" />
              </button>
            </div>

            <div className="pt-0.5">
              {adjustments.curves && (
                <CurveEditor
                  points={adjustments.curves[activeCurve]}
                  onChange={handleCurveChange}
                  color={curveColors[activeCurve]}
                  channel={activeCurve}
                />
              )}
            </div>
          </div>
        </AdjustmentSection>
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
  colorGradient?: 'temperature' | 'tint';
  defaultValue?: number;
}

function AdjustmentSlider({ label, value, onChange, min, max, colorGradient, defaultValue }: AdjustmentSliderProps) {
  // Calculate default value: use provided defaultValue, or calculate as middle point for symmetric ranges, or default to 0
  const defaultResetValue = defaultValue !== undefined
    ? defaultValue
    : (min < 0 && max > 0)
      ? 0  // For symmetric ranges (-100 to 100), default is 0 (neutral)
      : min === 0
        ? 0  // For ranges starting at 0, default is 0 (original/unadjusted)
        : Math.round((min + max) / 2);  // Otherwise use middle point

  // Local state for smooth dragging
  const [localValue, setLocalValue] = useState(value);
  const isDraggingRef = useRef(false);
  const lastCommittedValueRef = useRef(value);
  const debouncedPendingRef = useRef(false);

  // Sync local value when prop value changes (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      // Defer state update to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        if (!isDraggingRef.current) {
          setLocalValue(value);
          lastCommittedValueRef.current = value;
        }
      });
    }
  }, [value]);

  // Create debounced function using lodash
  const debouncedUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedUpdateRef.current = debounce((newValue: number) => {
      onChange([newValue]);
      lastCommittedValueRef.current = newValue;
      debouncedPendingRef.current = false;
    }, 50); // 50ms debounce for smooth updates

    return () => {
      debouncedUpdateRef.current?.cancel();
    };
  }, [onChange]);

  const handleValueChange = useCallback((newValue: number[]) => {
    const val = newValue[0];
    setLocalValue(val); // Update local state immediately for smooth UI
    debouncedPendingRef.current = true;
    debouncedUpdateRef.current?.(val); // Debounced update to store
  }, []);

  const handleValueCommit = useCallback(() => {
    // Cancel any pending debounced update
    debouncedUpdateRef.current?.cancel();

    // Only commit if the value changed and debounced update hasn't already fired
    if (localValue !== lastCommittedValueRef.current) {
      onChange([localValue]);
      lastCommittedValueRef.current = localValue;
    }

    debouncedPendingRef.current = false;
    isDraggingRef.current = false;
  }, [localValue, onChange]);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Cancel any pending debounced updates
    debouncedUpdateRef.current?.cancel();

    // Reset to default value
    setLocalValue(defaultResetValue);
    onChange([defaultResetValue]);
    lastCommittedValueRef.current = defaultResetValue;
    debouncedPendingRef.current = false;
    isDraggingRef.current = false;
  }, [defaultResetValue, onChange]);

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

  // Calculate gradient styles for the track
  const getTrackGradient = () => {
    if (!colorGradient) return undefined;

    if (colorGradient === 'temperature') {
      // Blue (cool) to Orange/Red (warm)
      // Center is neutral white
      return 'linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(147, 197, 253) 25%, rgb(255, 255, 255) 50%, rgb(255, 200, 150) 75%, rgb(255, 140, 100) 100%)';
    } else if (colorGradient === 'tint') {
      // Green to Magenta
      // Center is neutral white
      return 'linear-gradient(to right, rgb(34, 197, 94) 0%, rgb(134, 239, 172) 25%, rgb(255, 255, 255) 50%, rgb(250, 200, 250) 75%, rgb(200, 50, 200) 100%)';
    }
    return undefined;
  };

  const trackGradient = getTrackGradient();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
          {localValue}
        </span>
      </div>
      <div onPointerDown={handlePointerDown} onDoubleClick={handleDoubleClick} className="relative">
        {trackGradient && (
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background: trackGradient,
              height: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 0,
            }}
          />
        )}
        <div className="relative z-10">
          <Slider
            value={[localValue]}
            onValueChange={handleValueChange}
            min={min}
            max={max}
            step={1}
            className={cn(
              "[&_[role=slider]]:h-3 [&_[role=slider]]:w-3",
              trackGradient && "[&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
            )}
          />
        </div>
      </div>
    </div>
  );
}
