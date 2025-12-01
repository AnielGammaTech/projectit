import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Gauge, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProgressNeedle({ value = 0, onSave }) {
  const [localValue, setLocalValue] = useState(value);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (newValue) => {
    setLocalValue(newValue[0]);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(localValue);
    setIsDirty(false);
  };

  const getColor = () => {
    if (localValue < 25) return 'bg-red-500';
    if (localValue < 50) return 'bg-amber-500';
    if (localValue < 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-900">Progress Update</span>
        </div>
        <span className={cn(
          "text-2xl font-bold",
          localValue < 25 ? "text-red-600" :
          localValue < 50 ? "text-amber-600" :
          localValue < 75 ? "text-blue-600" : "text-emerald-600"
        )}>
          {localValue}%
        </span>
      </div>
      
      <div className="relative pt-2 pb-4">
        <Slider
          value={[localValue]}
          onValueChange={handleChange}
          max={100}
          step={5}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      <div className={cn(
        "h-2 rounded-full transition-all",
        getColor()
      )} style={{ width: `${localValue}%` }} />

      {isDirty && (
        <Button onClick={handleSave} size="sm" className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700">
          <Check className="w-4 h-4 mr-1.5" />
          Save Progress
        </Button>
      )}
    </div>
  );
}