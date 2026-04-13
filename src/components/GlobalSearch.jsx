import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { AnimatePresence } from 'framer-motion';
import {
  Search, X, FolderKanban, FileText, Users, Package,
  ListTodo, Filter, ChevronDown, HardDrive, User, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/recentSearches';

const RESULT_TYPES = {
  project: { label: 'Projects', icon: FolderKanban, color: 'text-indigo-600 bg-indigo-50' },
  proposal: { label: 'Proposals', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
  customer: { label: 'Customers', icon: Users, color: 'text-blue-600 bg-blue-50' },
  inventory: { label: 'Catalog', icon: Package, color: 'text-amber-600 bg-amber-50' },
  task: { label: 'Tasks', icon: ListTodo, color: 'text-violet-600 bg-violet-50' },
  asset: { label: 'Assets', icon: HardDrive, color: 'text-emerald-600 bg-emerald-50' },
  employee: { label: 'Employees', icon: User, color: 'text-teal-600 bg-teal-50' },
  part: { label: 'Parts', icon: Package, color: 'text-orange-600 bg-orange-50' },
  file: { label: 'Files', icon: FileText, color: 'text-rose-600 bg-rose-50' },
};

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    project: true,
    proposal: true,
    customer: true,
    inventory: true,
    task: true,
    asset: true,
    employee: true,
    part: true,
    file: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(-1);
      setRecentSearches(getRecentSearches());
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset activeIndex when query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0) {
      document.querySelector(`[data-search-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // --- Data queries ---

  const { data: projects = [] } = useQuery({
    queryKey: ['searchProjects'],
    queryFn: () => api.entities.Project.list('-created_date', 100),
    enabled: isOpen && filters.project,
    staleTime: 60000
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['searchProposals'],
    queryFn: () => api.entities.Proposal.list('-created_date', 100),
    enabled: isOpen && filters.proposal,
    staleTime: 60000
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['searchCustomers'],
    queryFn: () => api.entities.Customer.list('name', 100),
    enabled: isOpen && filters.customer,
    staleTime: 60000
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['searchInventory'],
    queryFn: () => api.entities.InventoryItem.list('name', 100),
    enabled: isOpen && filters.inventory,
    staleTime: 60000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['searchTasks'],
    queryFn: () => api.entities.Task.list('-created_date', 100),
    enabled: isOpen && filters.task,
    staleTime: 60000
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['searchAssets'],
    queryFn: () => api.entities.Asset.list('name', 100),
    enabled: isOpen && filters.asset,
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['searchEmployees'],
    queryFn: () => api.entities.Employee.list('first_name', 100),
    enabled: isOpen && filters.employee,
    staleTime: 60000,
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['searchParts'],
    queryFn: () => api.entities.Part.list('-created_date', 100),
    enabled: isOpen && filters.part,
    staleTime: 60000,
  });

  const { data: projectFiles = [] } = useQuery({
    queryKey: ['searchProjectFiles'],
    queryFn: () => api.entities.ProjectFile.list('-created_date', 100),
    enabled: isOpen && filters.file,
    staleTime: 60000,
  });

  // --- Derived data ---

  const activeProjectIds = useMemo(() =>
    projects
      .filter(p => p.status !== 'archived' && p.status !== 'deleted' && p.status !== 'completed')
      .map(p => p.id),
    [projects]
  );

  const projectMap = useMemo(() =>
    Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects]
  );

  const searchResults = useMemo(() => {
    const results = [];
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return results;

    if (filters.project) {
      projects.filter(p =>
        p.status !== 'deleted' &&
        (p.name?.toLowerCase().includes(lowerQuery) ||
        p.client?.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.project_number?.toString().includes(lowerQuery) ||
        p.halopsa_ticket_id?.includes(lowerQuery))
      ).forEach(p => results.push({ type: 'project', item: p, url: createPageUrl('ProjectDetail') + `?id=${p.id}` }));
    }

    if (filters.proposal) {
      proposals.filter(p =>
        p.title?.toLowerCase().includes(lowerQuery) ||
        p.customer_name?.toLowerCase().includes(lowerQuery) ||
        p.proposal_number?.toLowerCase().includes(lowerQuery)
      ).forEach(p => results.push({ type: 'proposal', item: p, url: createPageUrl('ProposalEditor') + `?id=${p.id}` }));
    }

    if (filters.customer) {
      customers.filter(c =>
        c.name?.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.company?.toLowerCase().includes(lowerQuery)
      ).forEach(c => results.push({ type: 'customer', item: c, url: createPageUrl('Customers') + `?highlight=${c.id}` }));
    }

    if (filters.inventory) {
      inventory.filter(i =>
        i.name?.toLowerCase().includes(lowerQuery) ||
        i.sku?.toLowerCase().includes(lowerQuery) ||
        i.category?.toLowerCase().includes(lowerQuery)
      ).forEach(i => results.push({ type: 'inventory', item: i, url: createPageUrl('Inventory') }));
    }

    if (filters.task) {
      tasks.filter(t =>
        activeProjectIds.includes(t.project_id) &&
        (t.title?.toLowerCase().includes(lowerQuery) ||
        t.description?.toLowerCase().includes(lowerQuery))
      ).forEach(t => results.push({ type: 'task', item: t, url: createPageUrl('AllTasks') }));
    }

    if (filters.asset) {
      assets.filter(a =>
        a.name?.toLowerCase().includes(lowerQuery) ||
        a.serial_number?.toLowerCase().includes(lowerQuery) ||
        a.model?.toLowerCase().includes(lowerQuery) ||
        a.hostname?.toLowerCase().includes(lowerQuery)
      ).forEach(a => results.push({
        type: 'asset',
        item: a,
        url: createPageUrl('AssetDetail') + `?id=${a.id}`,
      }));
    }

    if (filters.employee) {
      employees.filter(e => {
        const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
        return fullName.includes(lowerQuery) ||
          e.email?.toLowerCase().includes(lowerQuery) ||
          e.department?.toLowerCase().includes(lowerQuery);
      }).forEach(e => results.push({
        type: 'employee',
        item: { ...e, name: `${e.first_name || ''} ${e.last_name || ''}`.trim() },
        url: createPageUrl('AssetEmployeeDetail') + `?id=${e.id}`,
      }));
    }

    if (filters.part) {
      parts.filter(p =>
        p.name?.toLowerCase().includes(lowerQuery) ||
        p.part_number?.toLowerCase().includes(lowerQuery)
      ).forEach(p => results.push({
        type: 'part',
        item: p,
        url: p.project_id
          ? createPageUrl('ProjectParts') + `?id=${p.project_id}`
          : createPageUrl('AllTasks'),
      }));
    }

    if (filters.file) {
      projectFiles.filter(f =>
        f.name?.toLowerCase().includes(lowerQuery)
      ).forEach(f => results.push({
        type: 'file',
        item: f,
        url: f.project_id
          ? createPageUrl('ProjectFiles') + `?id=${f.project_id}`
          : '#',
      }));
    }

    return results;
  }, [query, filters, projects, proposals, customers, inventory, tasks, activeProjectIds, assets, employees, parts, projectFiles]);

  // --- Handlers ---

  const handleResultClick = useCallback((resultQuery) => {
    addRecentSearch(resultQuery);
    setRecentSearches(getRecentSearches());
    onClose();
  }, [onClose]);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      const visibleResults = searchResults.slice(0, 20);
      const maxIndex = visibleResults.length - 1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < maxIndex ? prev + 1 : 0));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const result = visibleResults[activeIndex];
        if (result) {
          addRecentSearch(query);
          setRecentSearches(getRecentSearches());
          window.location.href = result.url;
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, searchResults, activeIndex, query]);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Search Panel */}
      <div className="relative max-w-2xl mx-auto mt-20 bg-white dark:bg-[#1e2a3a] rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, proposals, customers, assets, employees..."
            className="flex-1 text-lg outline-none bg-transparent placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
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
            <div className="border-b dark:border-slate-700 bg-slate-50 dark:bg-[#151d2b] overflow-hidden">
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
            </div>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="p-4">
              {recentSearches.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recent Searches</p>
                    <button onClick={handleClearRecent} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                  </div>
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(term)}
                      className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <Clock className="w-4 h-4 text-slate-300" />
                      <span className="text-sm text-slate-600">{term}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Start typing to search across everything</p>
                </div>
              )}
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
                    data-search-index={idx}
                    className={cn(
                      "flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors",
                      idx === activeIndex && "bg-slate-100 dark:bg-slate-700"
                    )}
                    onClick={() => handleResultClick(query)}
                  >
                    <div className={cn("p-2 rounded-lg", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {result.item.name || result.item.title || result.item.proposal_number}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {result.type === 'project' && (
                          <>
                            {result.item.project_number && <span className="font-mono text-slate-400 mr-2">#{result.item.project_number}</span>}
                            {result.item.client}
                            {result.item.halopsa_ticket_id && <span className="ml-2 text-indigo-500">Ticket #{result.item.halopsa_ticket_id}</span>}
                          </>
                        )}
                        {result.type === 'proposal' && result.item.customer_name}
                        {result.type === 'customer' && result.item.email}
                        {result.type === 'inventory' && (result.item.category || result.item.sku)}
                        {result.type === 'task' && result.item.description?.slice(0, 50)}
                        {result.type === 'asset' && (
                          <>
                            {result.item.serial_number && <span className="font-mono text-slate-400 mr-2">{result.item.serial_number}</span>}
                            {result.item.model}
                          </>
                        )}
                        {result.type === 'employee' && (
                          <>
                            {result.item.email && <span className="text-slate-400 mr-2">{result.item.email}</span>}
                            {result.item.department}
                          </>
                        )}
                        {result.type === 'part' && (
                          <>
                            {result.item.part_number && <span className="font-mono text-slate-400 mr-2">#{result.item.part_number}</span>}
                            {result.item.project_id && projectMap[result.item.project_id] &&
                              <span className="text-orange-500">in {projectMap[result.item.project_id]}</span>
                            }
                          </>
                        )}
                        {result.type === 'file' && (
                          <>
                            {result.item.name?.split('.').pop()?.toUpperCase()}
                            {result.item.project_id && projectMap[result.item.project_id] &&
                              <span className="ml-2 text-rose-500">in {projectMap[result.item.project_id]}</span>
                            }
                          </>
                        )}
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
          <span><kbd className="px-1.5 py-0.5 bg-white border rounded">&#8593;&#8595;</kbd> to navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border rounded">&#8629;</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border rounded">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
