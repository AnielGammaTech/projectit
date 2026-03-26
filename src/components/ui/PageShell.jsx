import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageShell({ title, subtitle, breadcrumbs, actions, children, className, maxWidth = 'max-w-7xl' }) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className={cn(maxWidth, "mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8")}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              {title && <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
