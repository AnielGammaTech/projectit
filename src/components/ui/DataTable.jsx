import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function SortIcon({ direction }) {
  if (direction === 'asc') return <ChevronUp className="w-3.5 h-3.5" />;
  if (direction === 'desc') return <ChevronDown className="w-3.5 h-3.5" />;
  return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
}

export default function DataTable({
  columns,
  data = [],
  loading = false,
  pageSize = 20,
  emptyState,
  onRowClick,
  rowClassName,
  stickyHeader = true,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal)
        : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              {columns.map((col, j) => (
                <Skeleton key={j} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return emptyState;
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-warm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={cn(
              "border-b bg-muted/30",
              stickyHeader && "sticky top-0 z-10"
            )}>
              {columns.map((col) => (
                <th
                  key={col.key || col.label}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={cn(
                    "px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    col.sortable && "cursor-pointer hover:text-foreground transition-colors select-none",
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir : null} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((row, i) => (
              <motion.tr
                key={row.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                )}
              >
                {columns.map((col) => (
                  <td key={col.key || col.label} className={cn("px-5 py-3 text-sm", col.cellClassName)}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {sorted.length} total &middot; Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
