# ProjectIT Feature Plan

## Status: All 12 audit bugs FIXED + dead code removed

## Features to Implement

### Phase 1: Error Recovery & Resilience (This Week)
- [ ] Per-page error boundaries (wrap each page route, not just the app)
- [ ] Offline detection banner ("You're offline" with auto-retry)
- [ ] Auto-retry failed API calls (3 attempts with exponential backoff)
- [ ] Graceful fallback for all queries (safeList pattern across ALL pages, not just AssetInventory)

### Phase 2: Export & Reporting (This Week)
- [ ] CSV export on ManageIT Reports (All Assets tab)
- [ ] CSV export on ManageIT Reports (By Employee tab)
- [ ] CSV export on ManageIT Reports (Consent Forms tab)
- [ ] PDF download for signed consent forms
- [ ] CSV export on main Reports page (project data, time entries)

### Phase 3: Global Search Enhancement (Next Week)
- [ ] Add ManageIT assets to global search results
- [ ] Add employees to global search results
- [ ] Add parts to global search results
- [ ] Add files to global search results
- [ ] Recent searches (localStorage)

### Phase 4: Push Notifications Production (Next Week)
- [ ] Switch APNs from sandbox to production for TestFlight
- [ ] Re-register device tokens on production builds
- [ ] Admin-editable notification templates in Adminland
- [ ] Test end-to-end push flow

### Phase 5: Code Architecture (This Month)
- [ ] Split Adminland.jsx (5400 lines) into ~15 sub-components
- [ ] Split ProjectDetail.jsx (2159 lines) into sub-components
- [ ] Split Dashboard.jsx (1912 lines) into sub-components
- [ ] Create shared queryKeys constants
- [ ] Create shared staleTime presets (LIVE, FRESH, NORMAL, STATIC)
- [ ] Add basic test coverage (entity service, auth middleware, acceptance route)
