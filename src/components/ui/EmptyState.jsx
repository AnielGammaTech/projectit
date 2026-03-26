import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {Icon && (<div className="p-4 rounded-2xl bg-muted mb-4"><Icon className="w-8 h-8 text-muted-foreground" /></div>)}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (<Button onClick={onAction} className="bg-[#0F2F44] hover:bg-[#1a4a6e] dark:bg-blue-600 dark:hover:bg-blue-700">{actionLabel}</Button>)}
    </div>
  );
}
