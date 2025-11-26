'use client';

import { useState } from 'react';
import { useEditorStore, ImageAdjustments, Point } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Spline, Sparkles, Aperture } from 'lucide-react';
import { CurveEditor } from './CurveEditor';

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

  return (
    <div className="w-full h-full">
      <Accordion type="multiple" defaultValue={["light", "color", "detail"]} className="w-full">

        {/* Light Section */}
        <AccordionItem value="light">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <span>Light</span>
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

        {/* Color Section */}
        <AccordionItem value="color">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <Aperture className="w-4 h-4 text-muted-foreground" />
              <span>Color</span>
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
          </AccordionContent>
        </AccordionItem>

        {/* Detail Section */}
        <AccordionItem value="detail">
          <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span>Detail</span>
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
            <div className="flex items-center gap-2">
              <Spline className="w-4 h-4 text-muted-foreground" />
              <span>Curves</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-2 space-y-4">
            <Select
              value={activeCurve}
              onValueChange={(v: 'master' | 'red' | 'green' | 'blue') => setActiveCurve(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Master (RGB)</SelectItem>
                <SelectItem value="red">Red Channel</SelectItem>
                <SelectItem value="green">Green Channel</SelectItem>
                <SelectItem value="blue">Blue Channel</SelectItem>
              </SelectContent>
            </Select>

            <div className="pt-2 pb-2">
              {adjustments.curves && (
                <CurveEditor
                  points={adjustments.curves[activeCurve]}
                  onChange={handleCurveChange}
                  color={curveColors[activeCurve]}
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={onChange}
        min={min}
        max={max}
        step={1}
        className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
      />
    </div>
  );
}
