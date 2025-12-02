import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, FolderKanban, FileText, Users, Package, 
  ListTodo, Filter, ChevronDown 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const RESULT_TYPES = {
  project: { label: 'Projects', icon: FolderKanban, color: 'text-indigo-600 bg-indigo-50' },
  proposal: { label: 'Proposals', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
  customer: { label: 'Customers', icon: Users, color: 'text-blue-600 bg-blue-50' },
  inventory: { label: 'Catalog', icon: Package, color: 'text-amber-600 bg-amber-50' },
  task: { label: 'Tasks', icon: ListTodo, color: 'text-violet-600 bg-violet-50' }
};

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    project: true,
    proposal: true,
    customer: true,
    inventory: true,
    task: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const { data: projects = [] } = useQuery({
    queryKey: ['searchProjects'],
    queryFn: () => base44.entities.Project.list('-created_date', 100),
    enabled: isOpen && filters.project
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['searchProposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 100),
    enabled: isOpen && filters.proposal
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['searchCustomers'],
    queryFn: () => base44.entities.Customer.list('name', 100),
    enabled: isOpen && filters.customer
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['searchInventory'],
    queryFn: () => base44.entities.InventoryItem.list('name', 100),
    enabled: isOpen && filters.inventory
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['searchTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    enabled: isOpen && filters.task
  });

  const searchResults = [];
  const lowerQuery = query.toLowerCase().trim();

  if (lowerQuery && filters.project) {
    projects.filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.client?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery)
    ).forEach(p => searchResults.push({ type: 'project', item: p, url: createPageUrl('ProjectDetail') + `?id=${p.id}` }));
  }

  if (lowerQuery && filters.proposal) {
    proposals.filter(p => 
      p.title?.toLowerCase().includes(lowerQuery) ||
      p.customer_name?.toLowerCase().includes(lowerQuery) ||
      p.proposal_number?.toLowerCase().includes(lowerQuery)
    ).forEach(p => searchResults.push({ type: 'proposal', item: p, url: createPageUrl('ProposalEditor') + `?id=${p.id}` }));
  }

  if (lowerQuery && filters.customer) {
    customers.filter(c => 
      c.name?.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.company?.toLowerCase().includes(lowerQuery)
    ).forEach(c => searchResults.push({ type: 'customer', item: c, url: createPageUrl('Customers') + `?highlight=${c.id}` }));
  }

  if (lowerQuery && filters.inventory) {
    inventory.filter(i => 
      i.name?.toLowerCase().includes(lowerQuery) ||
      i.sku?.toLowerCase().includes(lowerQuery) ||
      i.category?.toLowerCase().includes(lowerQuery)
    ).forEach(i => searchResults.push({ type: 'inventory', item: i, url: createPageUrl('Inventory') }));
  }

  if (lowerQuery && filters.task) {
    tasks.filter(t => 
      t.title?.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
    ).forEach(t => searchResults.push({ type: 'task', item: t, url: createPageUrl('AllTasks') }));
  }

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Search Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative max-w-2xl mx-auto mt-20 bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, proposals, customers, tasks..."
            className="flex-1 text-lg outline-none placeholder:text-slate-400"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-1", showFilters && "bg-slate-100")}
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs">{activeFiltersCount}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
          </Button>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b bg-slate-50 overflow-hidden"
            >
              <div className="p-3 flex flex-wrap gap-3">
                {Object.entries(RESULT_TYPES).map(([key, config]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={filters[key]} 
                      onCheckedChange={() => toggleFilter(key)}
                    />
                    <config.icon className={cn("w-4 h-4", config.color.split(' ')[0])} />
                    <span className="text-sm">{config.label}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Start typing to search across everything</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="divide-y">
              {searchResults.slice(0, 20).map((result, idx) => {
                const config = RESULT_TYPES[result.type];
                const Icon = config.icon;
                
                return (
                  <a
                    key={`${result.type}-${result.item.id}`}
                    href={result.url}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
                    onClick={onClose}
                  >
                    <div className={cn("p-2 rounded-lg", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {result.item.name || result.item.title || result.item.proposal_number}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {result.type === 'project' && result.item.client}
                        {result.type === 'proposal' && result.item.customer_name}
                        {result.type === 'customer' && result.item.email}
                        {result.type === 'inventory' && (result.item.category || result.item.sku)}
                        {result.type === 'task' && result.item.description?.slice(0, 50)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {config.label}
                    </Badge>
                  </a>
                );
              })}
              {searchResults.length > 20 && (
                <div className="p-3 text-center text-sm text-slate-500">
                  Showing 20 of {searchResults.length} results
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="p-3 border-t bg-slate-50 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span><kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border rounded">esc</kbd> to close</span>
        </div>
      </motion.div>
    </div>
  );
}