import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

export default function InlineEdit({ value, onSave, placeholder = 'Click to edit', className, inputClassName, as: Tag = 'span', multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = () => {
    const trimmed = draft?.trim();
    if (trimmed && trimmed !== value) { onSave(trimmed); } else { setDraft(value); }
    setEditing(false);
  };
  const handleCancel = () => { setDraft(value); setEditing(false); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave(); } if (e.key === 'Escape') { handleCancel(); } };

  if (editing) {
    const InputTag = multiline ? 'textarea' : 'input';
    return (
      <div className="flex items-center gap-1.5">
        <InputTag ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave}
          className={cn("bg-card border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all", multiline && "min-h-[60px] resize-y", inputClassName)}
          placeholder={placeholder} />
      </div>
    );
  }

  return (
    <Tag onClick={() => setEditing(true)} className={cn("cursor-pointer group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:bg-muted/50 transition-colors", !value && "text-muted-foreground italic", className)} title="Click to edit">
      {value || placeholder}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Tag>
  );
}
