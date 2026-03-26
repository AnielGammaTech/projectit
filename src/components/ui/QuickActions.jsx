import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function QuickActions({ actions, align = 'end' }) {
  if (!actions || actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48 rounded-xl">
        {actions.map((action, i) => {
          if (action.separator) return <DropdownMenuSeparator key={`sep-${i}`} />;
          const Icon = action.icon;
          return (
            <DropdownMenuItem key={action.label} onClick={action.onClick} disabled={action.disabled}
              className={cn("cursor-pointer flex items-center gap-2 rounded-lg", action.destructive && "text-red-600 dark:text-red-400 focus:text-red-600")}>
              {Icon && <Icon className="w-4 h-4" />}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
