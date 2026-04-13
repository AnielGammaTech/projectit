# Phase 3: Global Search Enhancement

**Date:** 2026-04-13
**Status:** Planned
**File:** `src/components/GlobalSearch.jsx`

---

## Current State Analysis

### How search works today

- **Client-side filtering.** Each entity type is fetched in full via `useQuery` (up to 100 records per type, cached for 60 seconds). The `searchResults` memo filters all loaded data against the typed query using `String.includes()`.
- **Entity types supported:** Project, Proposal, Customer, InventoryItem, Task (5 types).
- **Result display:** Flat list capped at 20 results, each rendered as an `<a>` tag with an icon badge, primary text, subtitle, and type label.
- **Keyboard navigation:** Only Escape-to-close is implemented. The footer hints at Enter-to-select and arrow navigation, but neither is wired up. There is no `activeIndex` state or ArrowUp/ArrowDown handler.

### Architecture pattern

```
useQuery (fetch all) --> useMemo (filter client-side) --> flat results array --> render
```

Each new entity type follows the same pattern:
1. Add entry to `RESULT_TYPES` config object
2. Add `useQuery` call gated by `filters[type]`
3. Add filter block inside `searchResults` memo
4. Add subtitle rendering inside the result `<a>`

---

## Feature 1: ManageIT Assets in Search Results

### Entity & Fields

- **Entity:** `Asset` (via `api.entities.Asset.list()`)
- **Searchable fields:** `name`, `serial_number`, `model`, `hostname`
- **Display primary:** `asset.name`
- **Display subtitle:** Serial number (mono font), model, asset type badge

### Result Link

```
createPageUrl('AssetDetail') + `?id=${asset.id}`
```

### Icon & Badge

- **Icon:** `Monitor` (from lucide-react, already imported in AssetDetail)
- **Color:** `text-cyan-600 bg-cyan-50` (distinct from existing palette)
- **Label:** `Assets`

### RESULT_TYPES addition

```js
asset: { label: 'Assets', icon: Monitor, color: 'text-cyan-600 bg-cyan-50' }
```

### Filter logic

```js
if (filters.asset) {
  assets.filter(a =>
    a.name?.toLowerCase().includes(lowerQuery) ||
    a.serial_number?.toLowerCase().includes(lowerQuery) ||
    a.model?.toLowerCase().includes(lowerQuery) ||
    a.hostname?.toLowerCase().includes(lowerQuery)
  ).forEach(a => results.push({
    type: 'asset',
    item: a,
    url: createPageUrl('AssetDetail') + `?id=${a.id}`
  }));
}
```

### Subtitle rendering

```jsx
{result.type === 'asset' && (
  <>
    {result.item.serial_number && <span className="font-mono text-slate-400 mr-2">{result.item.serial_number}</span>}
    {result.item.model}
  </>
)}
```

---

## Feature 2: Employees in Search Results

### Entity & Fields

- **Entity:** `Employee` (via `api.entities.Employee.list()`)
- **Searchable fields:** `first_name`, `last_name`, `email`, `department`
- **Display primary:** `${employee.first_name} ${employee.last_name}`
- **Display subtitle:** email, department badge

### Result Link

```
createPageUrl('AssetEmployeeDetail') + `?id=${employee.id}`
```

### Icon & Badge

- **Icon:** `User` (from lucide-react)
- **Color:** `text-rose-600 bg-rose-50`
- **Label:** `Employees`

### RESULT_TYPES addition

```js
employee: { label: 'Employees', icon: User, color: 'text-rose-600 bg-rose-50' }
```

### Filter logic

```js
if (filters.employee) {
  employees.filter(e => {
    const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
    return fullName.includes(lowerQuery) ||
      e.email?.toLowerCase().includes(lowerQuery) ||
      e.department?.toLowerCase().includes(lowerQuery);
  }).forEach(e => results.push({
    type: 'employee',
    item: { ...e, name: `${e.first_name || ''} ${e.last_name || ''}`.trim() },
    url: createPageUrl('AssetEmployeeDetail') + `?id=${e.id}`
  }));
}
```

### Subtitle rendering

```jsx
{result.type === 'employee' && (
  <>
    {result.item.email && <span className="text-slate-400 mr-2">{result.item.email}</span>}
    {result.item.department}
  </>
)}
```

---

## Feature 3: Parts in Search Results

### Entity & Fields

- **Entity:** `Part` (via `api.entities.Part.list('-created_date', 100)`)
- **Searchable fields:** `name`, `part_number`
- **Display primary:** `part.name`
- **Display subtitle:** Part number (mono font), status badge, project context

### Result Link

Parts belong to a project. Link to the project's parts subpage:

```
createPageUrl('ProjectParts') + `?id=${part.project_id}`
```

Falls back to `AllTasks` if `project_id` is missing (parts also appear in the tasks view).

### Icon & Badge

- **Icon:** `Wrench` (from lucide-react)
- **Color:** `text-orange-600 bg-orange-50`
- **Label:** `Parts`

### RESULT_TYPES addition

```js
part: { label: 'Parts', icon: Wrench, color: 'text-orange-600 bg-orange-50' }
```

### Filter logic

```js
if (filters.part) {
  parts.filter(p =>
    p.name?.toLowerCase().includes(lowerQuery) ||
    p.part_number?.toLowerCase().includes(lowerQuery)
  ).forEach(p => results.push({
    type: 'part',
    item: p,
    url: p.project_id
      ? createPageUrl('ProjectParts') + `?id=${p.project_id}`
      : createPageUrl('AllTasks')
  }));
}
```

### Subtitle rendering

```jsx
{result.type === 'part' && (
  <>
    {result.item.part_number && <span className="font-mono text-slate-400 mr-2">#{result.item.part_number}</span>}
    {result.item.status}
  </>
)}
```

### Cross-reference with projects

To show the project name in the subtitle, look up projects already loaded by the `searchProjects` query. No extra query needed.

---

## Feature 4: Files in Search Results

### Entity & Fields

- **Entity:** `ProjectFile` (via `api.entities.ProjectFile.list('-created_date', 100)`)
- **Searchable fields:** `name` (the file name)
- **Display primary:** `file.name`
- **Display subtitle:** File type/extension, project context

### Result Link

```
createPageUrl('ProjectFiles') + `?id=${file.project_id}`
```

### Icon & Badge

- **Icon:** `FileText` (already imported)
- Note: `FileText` is already used by proposals. Use `File` from lucide-react instead, or keep `FileText` but with a different color.
- **Color:** `text-teal-600 bg-teal-50`
- **Label:** `Files`

### RESULT_TYPES addition

```js
file: { label: 'Files', icon: File, color: 'text-teal-600 bg-teal-50' }
```

### Filter logic

```js
if (filters.file) {
  projectFiles.filter(f =>
    f.name?.toLowerCase().includes(lowerQuery)
  ).forEach(f => results.push({
    type: 'file',
    item: f,
    url: f.project_id
      ? createPageUrl('ProjectFiles') + `?id=${f.project_id}`
      : '#'
  }));
}
```

### Subtitle rendering

```jsx
{result.type === 'file' && (
  <>
    {result.item.name?.split('.').pop()?.toUpperCase()}
    {result.item.project_id && projectMap[result.item.project_id] &&
      <span className="ml-2 text-teal-500">in {projectMap[result.item.project_id]}</span>
    }
  </>
)}
```

### Project name lookup

Build a `projectMap` memo from the already-loaded projects array:

```js
const projectMap = useMemo(() =>
  Object.fromEntries(projects.map(p => [p.id, p.name])),
  [projects]
);
```

This serves both file and part subtitle rendering without additional queries.

---

## Feature 5: Recent Searches

### Storage

- **Key:** `projectit_recent_searches`
- **Format:** JSON array of strings, max 5 entries
- **Storage:** `localStorage`

### Behavior

1. When `query` is empty and search panel is open, show recent searches as clickable suggestions.
2. When user selects a result (clicks or presses Enter), save the current query to recent searches.
3. Deduplicate: if the same query exists, move it to the front.
4. Trim to 5 entries.

### Helper functions (extract to `src/lib/recentSearches.ts`)

```ts
const STORAGE_KEY = 'projectit_recent_searches';
const MAX_RECENT = 5;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const existing = getRecentSearches();
  const filtered = existing.filter(s => s !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecentSearches(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

### UI rendering (empty state replacement)

Replace the current "Start typing to search" empty state:

```jsx
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
) : /* ... existing results rendering */ }
```

### Save on result click

Add to the `<a>` onClick handler:

```jsx
onClick={() => {
  addRecentSearch(query);
  onClose();
}}
```

---

## Keyboard Navigation Fix

The footer already hints at arrow keys and Enter, but the logic is missing.

### New state

```js
const [activeIndex, setActiveIndex] = useState(-1);
```

### Reset on query change

```js
useEffect(() => { setActiveIndex(-1); }, [query]);
```

### Keyboard handler (replace current Escape-only handler)

```js
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }

    const maxIndex = Math.min(searchResults.length, 20) - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => prev < maxIndex ? prev + 1 : 0);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => prev > 0 ? prev - 1 : maxIndex);
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const result = searchResults[activeIndex];
      if (result) {
        addRecentSearch(query);
        window.location.href = result.url;
        onClose();
      }
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose, searchResults, activeIndex, query]);
```

### Active item styling

Add to the result `<a>` element:

```jsx
className={cn(
  "flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors",
  idx === activeIndex && "bg-slate-100 dark:bg-slate-700"
)}
```

### Scroll into view

```js
useEffect(() => {
  if (activeIndex >= 0) {
    document.querySelector(`[data-search-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }
}, [activeIndex]);
```

Add `data-search-index={idx}` to each result `<a>`.

### Footer update

```jsx
<span><kbd>↑↓</kbd> to navigate</span>
<span><kbd>↵</kbd> to select</span>
<span><kbd>esc</kbd> to close</span>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/GlobalSearch.jsx` | Add 4 new entity types, queries, filter logic, subtitles, keyboard nav, recent searches UI |
| `src/lib/recentSearches.ts` | **New file** -- localStorage helpers for recent searches |

### No other files need modification

The API client uses a dynamic `Proxy` so `api.entities.Asset.list()`, `api.entities.Employee.list()`, etc. work without any changes to `apiClient.js`. Page routes already exist in `pages.config.js`.

---

## New Imports Required in GlobalSearch.jsx

```js
import { Monitor, User, Wrench, File, Clock } from 'lucide-react';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/recentSearches';
```

Note: `User` is already imported. `Monitor`, `Wrench`, `File`, `Clock` are new.

---

## Updated RESULT_TYPES (full)

```js
const RESULT_TYPES = {
  project:   { label: 'Projects',   icon: FolderKanban, color: 'text-indigo-600 bg-indigo-50' },
  proposal:  { label: 'Proposals',  icon: FileText,     color: 'text-emerald-600 bg-emerald-50' },
  customer:  { label: 'Customers',  icon: Users,        color: 'text-blue-600 bg-blue-50' },
  inventory: { label: 'Catalog',    icon: Package,      color: 'text-amber-600 bg-amber-50' },
  task:      { label: 'Tasks',      icon: ListTodo,     color: 'text-violet-600 bg-violet-50' },
  asset:     { label: 'Assets',     icon: Monitor,      color: 'text-cyan-600 bg-cyan-50' },
  employee:  { label: 'Employees',  icon: User,         color: 'text-rose-600 bg-rose-50' },
  part:      { label: 'Parts',      icon: Wrench,       color: 'text-orange-600 bg-orange-50' },
  file:      { label: 'Files',      icon: File,         color: 'text-teal-600 bg-teal-50' },
};
```

---

## Updated filters State (full)

```js
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
```

---

## New useQuery Calls

```js
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
```

---

## Display Name Resolution

The result renderer uses `result.item.name || result.item.title || result.item.proposal_number` for the primary text. For the new types:

- **Asset:** Has `name` field -- works as-is.
- **Employee:** No `name` field, has `first_name` + `last_name`. Inject a computed `name` when building the result (see Feature 2 filter logic above).
- **Part:** Has `name` field -- works as-is.
- **File:** Has `name` field -- works as-is.

---

## Performance Considerations

- Adding 4 new queries (each up to 100 records) increases initial data load when search opens. All queries use `staleTime: 60000` and are gated by `enabled: isOpen && filters[type]`, so they only fire when the panel is open and the filter is active.
- Client-side filtering of 900 records (9 types x 100) through `String.includes()` is fast enough for this scale. No debounce needed for the memo.
- If record counts grow beyond 100 per type, consider switching to a server-side search endpoint (`/api/search?q=...`) that queries all tables in parallel and returns unified results.

---

## Implementation Order

1. Create `src/lib/recentSearches.ts` (standalone, no dependencies)
2. Add new `RESULT_TYPES` entries and imports
3. Add new `useQuery` calls
4. Expand `filters` state
5. Add filter blocks to `searchResults` memo
6. Add subtitle rendering for each new type
7. Add `projectMap` memo for file/part context
8. Implement keyboard navigation (activeIndex state, ArrowUp/Down/Enter handlers, active styling)
9. Integrate recent searches (load on open, save on select, render in empty state)
10. Test all 9 entity types, verify links navigate correctly
