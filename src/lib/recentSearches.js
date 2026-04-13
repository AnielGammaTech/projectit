const STORAGE_KEY = 'projectit_recent_searches';
const MAX_RECENT = 5;

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query) {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const existing = getRecentSearches();
  const filtered = existing.filter(s => s !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}
