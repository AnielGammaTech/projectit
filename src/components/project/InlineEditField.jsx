import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function InlineTextEdit({ value, onSave, className, placeholder = 'Click to edit' }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const handleSave = () => {
    if (localValue !== value) {
      onSave(localValue);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setLocalValue(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className={cn("h-8", className)}
        />
      </div>
    );
  }

  return (
    <span 
      onClick={() => { setLocalValue(value); setEditing(true); }}
      className={cn(
        "cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors",
        !value && "text-slate-400 italic",
        className
      )}
    >
      {value || placeholder}
    </span>
  );
}

export function InlineSelectEdit({ 
  value, 
  options, 
  onSave, 
  renderValue,
  renderOption 
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          {renderValue ? renderValue(value) : value}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => (
          <DropdownMenuItem 
            key={option.value} 
            onClick={() => onSave(option.value)}
          >
            {renderOption ? renderOption(option) : option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InlineBadgeSelect({ 
  value, 
  options, 
  onSave,
  colorMap = {}
}) {
  const currentOption = options.find(o => o.value === value) || options[0];
  const color = colorMap[value] || 'bg-slate-100 text-slate-700';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn("cursor-pointer hover:opacity-80 transition-opacity", color)}
        >
          {currentOption?.label || value}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => (
          <DropdownMenuItem 
            key={option.value} 
            onClick={() => onSave(option.value)}
          >
            <Badge className={cn("mr-2", colorMap[option.value] || 'bg-slate-100')}>
              {option.label}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}