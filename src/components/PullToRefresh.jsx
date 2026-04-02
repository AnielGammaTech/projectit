import { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pull-to-refresh wrapper for mobile pages.
 * Wrap your page content with this component.
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await refetchAll(); }}>
 *     <div>...page content...</div>
 *   </PullToRefresh>
 */
export default function PullToRefresh({ onRefresh, children, className }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when scrolled to top
    if (containerRef.current?.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    if (containerRef.current?.scrollTop > 0) {
      setPulling(false);
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Rubber band effect — diminishing returns past threshold
      const distance = Math.min(delta * 0.5, 120);
      setPullDistance(distance);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (err) {
        // Silently handle refresh errors
      }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <div className={cn(
            "w-8 h-8 rounded-full bg-card border border-border shadow-sm flex items-center justify-center transition-transform",
            pullDistance >= THRESHOLD && !refreshing && "scale-110"
          )}>
            <Loader2 className={cn(
              "w-4 h-4 text-muted-foreground",
              refreshing && "animate-spin",
              !refreshing && "transition-transform"
            )}
              style={!refreshing ? { transform: `rotate(${pullDistance * 3}deg)` } : undefined}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
