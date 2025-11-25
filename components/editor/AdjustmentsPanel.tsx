'use client';

import { useState } from 'react';
import { useEditorStore, ImageAdjustments, Point } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Contrast, Droplets, Thermometer, Zap, Move, Activity, Spline } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-semibold text-lg">Adjustments</h2>
        <p className="text-sm text-muted-foreground">
          Fine-tune your image
        </p>
      </div>

      <Tabs defaultValue="light">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="light">Light</TabsTrigger>
          <TabsTrigger value="color">Color</TabsTrigger>
          <TabsTrigger value="detail">Detail</TabsTrigger>
          <TabsTrigger value="curves">Curves</TabsTrigger>
        </TabsList>
        
        <TabsContent value="light" className="space-y-6 pt-4">
          <div className="space-y-4">
            <AdjustmentSlider
              label="Exposure"
              icon={<Sun className="w-4 h-4" />}
              value={adjustments.exposure}
              onChange={handleChange('exposure')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Contrast"
              icon={<Contrast className="w-4 h-4" />}
              value={adjustments.contrast}
              onChange={handleChange('contrast')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Highlights"
              icon={<Zap className="w-4 h-4" />}
              value={adjustments.highlights}
              onChange={handleChange('highlights')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Shadows"
              icon={<Move className="w-4 h-4" />}
              value={adjustments.shadows}
              onChange={handleChange('shadows')}
              min={-100}
              max={100}
            />
          </div>
        </TabsContent>

        <TabsContent value="color" className="space-y-6 pt-4">
          <div className="space-y-4">
            <AdjustmentSlider
              label="Saturation"
              icon={<Droplets className="w-4 h-4" />}
              value={adjustments.saturation}
              onChange={handleChange('saturation')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Temperature"
              icon={<Thermometer className="w-4 h-4" />}
              value={adjustments.temperature}
              onChange={handleChange('temperature')}
              min={-100}
              max={100}
            />
            <AdjustmentSlider
              label="Tint"
              icon={<Activity className="w-4 h-4" />}
              value={adjustments.tint}
              onChange={handleChange('tint')}
              min={-100}
              max={100}
            />
          </div>
        </TabsContent>

        <TabsContent value="detail" className="space-y-6 pt-4">
            <div className="space-y-4">
                <AdjustmentSlider
                label="Sharpness"
                icon={<Activity className="w-4 h-4" />}
                value={adjustments.sharpness}
                onChange={handleChange('sharpness')}
                min={0}
                max={100}
                />
                 <AdjustmentSlider
                label="Blur"
                icon={<Droplets className="w-4 h-4" />}
                value={adjustments.blur}
                onChange={handleChange('blur')}
                min={0}
                max={100}
                />
            </div>
        </TabsContent>

        <TabsContent value="curves" className="space-y-6 pt-4">
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Spline className="w-4 h-4" />
                    <Label>Curve Channel</Label>
                </div>
                <Select 
                    value={activeCurve} 
                    onValueChange={(v: 'master' | 'red' | 'green' | 'blue') => setActiveCurve(v)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="master">Master (RGB)</SelectItem>
                        <SelectItem value="red">Red Channel</SelectItem>
                        <SelectItem value="green">Green Channel</SelectItem>
                        <SelectItem value="blue">Blue Channel</SelectItem>
                    </SelectContent>
                </Select>
                
                <div className="pt-2">
                    {adjustments.curves && (
                        <CurveEditor 
                            points={adjustments.curves[activeCurve]} 
                            onChange={handleCurveChange}
                            color={curveColors[activeCurve]}
                        />
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Drag points to adjust the tone curve.
                </p>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface AdjustmentSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number[]) => void;
  min: number;
  max: number;
}

function AdjustmentSlider({ label, icon, value, onChange, min, max }: AdjustmentSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </Label>
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={onChange}
        min={min}
        max={max}
        step={1}
        className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
      />
    </div>
  );
}
