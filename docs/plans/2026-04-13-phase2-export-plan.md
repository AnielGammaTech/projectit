# Phase 2: Export & Reporting

**Date:** 2026-04-13
**Status:** Planned
**Scope:** CSV exports on ManageIT Reports + main Reports page, PDF download for signed consent forms

---

## Overview

Add data export capabilities across three areas of ProjectIT:
1. CSV exports on the ManageIT Asset Reports page (All Assets, By Employee, Consent Forms)
2. PDF download for signed consent forms
3. CSV exports on the main Reports page (Overview, Financial, Team)

All CSV generation is client-side using data already in React Query cache. PDF generation uses `jspdf` which is already installed (`"jspdf": "^2.5.2"` in `package.json`).

---

## Existing Patterns

Two CSV export patterns already exist in the codebase and should be followed for consistency:

- **`src/pages/TimeReport.jsx`** (lines 79-97) -- builds CSV rows, wraps cells in quotes, creates Blob, triggers anchor click download
- **`src/pages/ReportBuilder.jsx`** (lines 234-244) -- simpler version without quoting

The `TimeReport.jsx` pattern with quoted cells is more robust (handles commas in data) and should be the standard.

---

## 1. CSV Exports on ManageIT Asset Reports

**File to modify:** `src/pages/AssetReports.jsx`
**New file to create:** `src/utils/csvExport.js`

### 1a. Shared CSV Utility

Extract the CSV-export logic into a reusable utility so all three pages use the same function.

**`src/utils/csvExport.js`** (~30 lines)

```
function escapeCsvCell(value) -- escape quotes, wrap in quotes
function buildCsvString(headers, rows) -- join with commas/newlines
function downloadCsv(csvString, filename) -- Blob + anchor click
function exportToCsv(headers, rows, filename) -- orchestrator
```

### 1b. All Assets Tab CSV

**Trigger:** "Download CSV" button added next to the search bar (line ~499 area).

**CSV columns:**
| Column | Source |
|--------|--------|
| Name | `asset.name` |
| Type | `asset.asset_type` |
| OS | `asset.os` |
| OS Version | `asset.os_version` |
| Serial Number | `asset.serial_number` |
| Manufacturer | `asset.manufacturer` |
| Model | `asset.model` |
| Employee | resolved from `activeAssignmentMap` + `employeeMap` |
| Status | `asset.status` |
| Condition | `asset.condition` |
| Online | `asset.device_active` (Yes/No) |
| Last Contact | `asset.last_contact` (formatted date) |
| Purchase Cost | `asset.purchase_cost` |

**Data source:** The `rows` array from the `TabAllAssets` component (already filtered/sorted by search). The export button will need access to this processed data, so either lift the export handler up or pass a callback.

**Approach:** Add an `onExport` callback prop to `TabAllAssets`. The parent component calls `exportToCsv` with the current filtered rows. This keeps the tab component unaware of CSV logic.

**Complexity:** Low (1-2 hours)

### 1c. By Employee Tab CSV

**Trigger:** "Download CSV" button in the tab header area.

**CSV columns:**
| Column | Source |
|--------|--------|
| Employee Name | `emp.first_name + emp.last_name` |
| Department | `emp.department` |
| Device Name | `asset.name` |
| Device Type | `asset.asset_type` |
| Serial Number | `asset.serial_number` |
| Condition | `asset.condition` |

One row per employee-device pair (not grouped).

**Data source:** The `employeeDevices` array from `TabByEmployee`, expanded to individual device rows by iterating `emp.deviceIds` and resolving each from `assetMap`.

**Complexity:** Low (1 hour)

### 1d. Consent Forms Tab CSV

**Trigger:** "Download CSV" button next to the status filter buttons (line ~319 area).

**CSV columns:**
| Column | Source |
|--------|--------|
| Asset | `r.assetName` |
| Employee | `r.empName` |
| Status | `r.status` |
| Signed Date | `r.signed_at` (formatted) |
| Signer Name | `r.signer_name` |
| Signer IP | `r.signer_ip` |

**Data source:** The `rows` array from `TabConsentForms` (already filtered by status).

**Complexity:** Low (1 hour)

### Implementation Plan for Asset Reports CSV

1. Create `src/utils/csvExport.js` with shared utility functions
2. Modify `AssetReports.jsx`:
   - Import `Download` icon from lucide-react
   - Import `exportToCsv` from the new utility
   - Add export handler functions for each tab at the parent level
   - Pass data down or lift filtered data up via refs/callbacks
   - Add a `<Button>` with Download icon in the toolbar area, conditionally rendered per active tab (tabs 0, 1, 2 get export; tab 3 "Value & Cost" does not since it is aggregate data)
3. Write tests for `csvExport.js` utility

---

## 2. PDF Download for Signed Consent Forms

**Files to modify:** `src/pages/AssetReports.jsx` (add download button per row), `src/pages/AssetDetail.jsx` (optional -- add download there too)
**New file to create:** `src/utils/consentPdf.js`

### Approach: jsPDF (already installed)

`jspdf` is already a dependency. No new packages needed. This is the right choice because:
- Already in the bundle -- zero additional weight
- Works entirely client-side
- Supports images (for signature), text layout, and basic styling
- No server round-trip required

Alternatives considered and rejected:
- **html2pdf.js** -- wraps html2canvas + jsPDF, adds ~200KB, unnecessary since we are building the layout programmatically not converting HTML
- **@react-pdf/renderer** -- heavy (~500KB), designed for complex document layouts, overkill for a single-page form
- **Server-side generation** -- adds API endpoint complexity, latency, and server dependency for something that can be done client-side

### PDF Layout

Single-page document, portrait A4:

```
+------------------------------------------+
|  [Company Name]              [Date]       |
|  [Form Title]                             |
|------------------------------------------|
|  ASSET DETAILS                            |
|  Name: MacBook Pro 16"                    |
|  Type: Laptop                             |
|  Serial: C02X12345                        |
|  Condition at Checkout: Good              |
|------------------------------------------|
|  TERMS OF ACCEPTANCE                      |
|  [Full terms text, word-wrapped]          |
|                                           |
|------------------------------------------|
|  ACKNOWLEDGMENT                           |
|  [Signature image]                        |
|  Signed by: John Doe                      |
|  Date: April 13, 2026                     |
|  IP Address: 192.168.1.100               |
+------------------------------------------+
```

### Data Required

All data is available from existing React Query cache:

| Field | Source |
|-------|--------|
| Company Name | `AppSettings` where `setting_key === 'consent_form'` -> `company_name` |
| Form Title | `AppSettings` -> `form_title` |
| Terms Text | `AppSettings` -> `terms_text` |
| Asset Name | `asset.name` |
| Asset Type | `asset.asset_type` |
| Serial Number | `asset.serial_number` |
| Condition | `acceptance.condition_at_checkout` |
| Signature Image | `acceptance.signature_data` (base64 data URL) |
| Signer Name | `acceptance.signer_name` |
| Signed Date | `acceptance.signed_at` |
| Signer IP | `acceptance.signer_ip` |

### `src/utils/consentPdf.js` (~80-100 lines)

```
function generateConsentPdf({ companyName, formTitle, termsText, asset, acceptance })
  - Creates new jsPDF('p', 'mm', 'a4')
  - Sets fonts: bold for headers, normal for body
  - Draws company name + date at top
  - Draws form title
  - Draws horizontal rule
  - Draws asset details section
  - Draws terms text with doc.splitTextToSize() for word wrapping
  - Draws signature image with doc.addImage() (supports base64 PNG/JPEG)
  - Draws signer name, date, IP
  - Returns doc (caller decides save vs preview)

function downloadConsentPdf(params)
  - Calls generateConsentPdf
  - Calls doc.save(`consent-form-${asset.name}-${date}.pdf`)
```

### UI Integration

**In `AssetReports.jsx` Consent Forms tab:**
- Add a `Download` icon button in each table row (new column), only enabled when `status === 'signed'`
- On click, fetch the full acceptance record (it already has `signature_data`, `signer_name`, `signer_ip`, `signed_at`) and consent settings from cache
- Call `downloadConsentPdf`

**In `AssetDetail.jsx` acceptance section (line ~153 area):**
- Add a small "Download PDF" link/button next to the "Acknowledged" badge
- Same logic as above

### Data Fetching Note

The `acceptances` array from React Query on `AssetReports` may not include `signature_data` or `signer_ip` in the list response (these are larger fields). Two options:

**Option A (preferred):** Fetch the individual acceptance record on-demand when the user clicks Download PDF. This avoids loading all signature images upfront.

**Option B:** Include all fields in the list query. This is simpler but loads all base64 signatures into memory.

Recommend Option A -- add a one-time fetch: `api.entities.AssetAcceptance.get(acceptanceId)` before generating the PDF.

**Complexity:** Medium (3-4 hours)

---

## 3. CSV Exports on Main Reports Page

**File to modify:** `src/pages/Reports.jsx`

### 3a. Overview Tab Export

**Trigger:** "Export CSV" button in the header area near the tab bar.

**CSV columns:**
| Column | Source |
|--------|--------|
| Metric | label string |
| Value | computed value |

Rows:
- Active Projects, `activeProjects.length`
- Task Completion Rate, `completedTasks.length / projectTasks.length * 100`
- Tasks Completed, `completedTasks.length`
- Active Tasks, `activeTasks.length`
- Overdue Tasks, `overdueTasks.length`
- Hours Logged, `totalHours`
- Portfolio Value, `totalRetail`
- Margin %, `marginPercent`

Plus a second section for per-project health:
- Project Name, Completion %

**Complexity:** Low (1 hour)

### 3b. Financial Tab Export

**Trigger:** "Export CSV" button in the Financial tab header.

**CSV -- Summary section:**
| Column | Source |
|--------|--------|
| Category | label |
| Cost | cost value |
| Retail | retail value |
| Item Count | count |

Rows: Project Items, Stocked Inventory, In Transit, To be Ordered, Total, Margin

**CSV -- Project Breakdown section (if a project is selected):**
| Column | Source |
|--------|--------|
| Part Name | `part.name` |
| Quantity | `part.quantity` |
| Unit Cost | `part.unit_cost` |
| Sell Price | `part.sell_price` |
| Status | `part.status` |
| Line Cost | `quantity * unit_cost` |
| Line Retail | `quantity * sell_price` |

**Complexity:** Low-Medium (2 hours)

### 3c. Team Tab Export

**Trigger:** "Export CSV" button in the Team tab header.

**CSV columns:**
| Column | Source |
|--------|--------|
| Team Member | `member.fullName` |
| Total Tasks | `member.total` |
| Completed Tasks | `member.completed` |
| Completion Rate % | `member.rate` |
| Hours Logged | `member.hours` |

**Complexity:** Low (1 hour)

### Implementation Plan for Reports CSV

1. Import `exportToCsv` from `src/utils/csvExport.js`
2. Import `Download` icon from lucide-react (already imported)
3. Add export handler per tab that reads from the already-computed local variables
4. Add a `<Button>` next to each tab section title or in the header bar
5. The button label/filename changes based on `activeTab`

---

## Files Summary

### New Files
| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `src/utils/csvExport.js` | ~35 | Shared CSV generation + download utility |
| `src/utils/consentPdf.js` | ~100 | jsPDF-based consent form PDF generator |
| `src/utils/__tests__/csvExport.test.js` | ~60 | Unit tests for CSV utility |
| `src/utils/__tests__/consentPdf.test.js` | ~50 | Unit tests for PDF generator |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/AssetReports.jsx` | Add Download CSV buttons to tabs 0-2, add Download PDF button to consent forms rows, import utilities |
| `src/pages/AssetDetail.jsx` | Add Download PDF link to signed acceptance section |
| `src/pages/Reports.jsx` | Add Export CSV buttons to Overview, Financial, Team tabs |

---

## Complexity Estimates

| Task | Complexity | Est. Hours |
|------|-----------|------------|
| CSV utility (`csvExport.js`) | Low | 0.5 |
| All Assets CSV | Low | 1.5 |
| By Employee CSV | Low | 1 |
| Consent Forms CSV | Low | 1 |
| Consent Form PDF (`consentPdf.js`) | Medium | 3 |
| PDF button in AssetReports + AssetDetail | Low | 1 |
| Reports Overview CSV | Low | 1 |
| Reports Financial CSV | Low-Medium | 1.5 |
| Reports Team CSV | Low | 1 |
| Tests | Low | 1.5 |
| **Total** | | **~13 hours** |

---

## Implementation Order

1. **`src/utils/csvExport.js`** + tests -- foundation for all CSV exports
2. **AssetReports CSV** (All Assets, By Employee, Consent Forms) -- highest user value, uses ManageIT data
3. **`src/utils/consentPdf.js`** + tests -- PDF generation logic
4. **PDF download button** on AssetReports consent tab + AssetDetail page
5. **Reports page CSV** (Overview, Financial, Team) -- last since ReportBuilder already has basic export

---

## Technical Notes

- CSV cells must be quoted to handle commas in names, descriptions, etc.
- The `signature_data` field is a base64 data URL (PNG). `jsPDF.addImage()` accepts this directly.
- `jsPDF.splitTextToSize()` handles word wrapping for the terms text block.
- All exports use the filtered/sorted data the user currently sees (respects search, status filters).
- PDF filename format: `consent-form-{asset-name}-{date}.pdf`
- CSV filename format: `{report-name}-{date}.csv`
- No server endpoints needed -- everything runs client-side.
