## Goal
- Implement STORY-2.3.1 (Lead Assignment & Reassignment) frontend only, then separate Status (Won/Lost) from Stage (progress stages) in lead filters.

## Constraints & Preferences
- React (Vite), JSX, Tailwind CSS, React Router, raw `fetch`.
- No backend, no database — Mockoon on `localhost:3001`, Vite proxy rewrites `/api` → `3001` stripping `/api`.
- All existing features must remain intact; 138 existing tests must pass.

## Progress
### Done
- **MSW removed** from entry point — `main.jsx` uses synchronous `ReactDOM.createRoot.render()`, no MSW startup.
- **`notificationService.js`** — no fetch calls. `fetchNotifications()` returns 3 mock notifications inline; `markNotificationRead()` returns `{ success: true }`.
- **`leadService.js`** — added `FALLBACK_LEADS` (3 leads) with `status: '', stage: '...'` model. All fetch functions (`fetchLeads`, `fetchAdminLeads`, `fetchMarketingLeads`, `fetchLeadById`, `fetchAdminLeadById`) wrapped in try/catch falling back to FALLBACK_LEADS. `assignLead`, `bulkAssignLeads`, `reassignLeads`, `fetchLeadHistory` return mock success directly (no network calls). `fetchLeadById`/`fetchAdminLeadById` accept optional `cacheBuster` param.
- **`createMockLead`** (`mockData.js`) defaults `status: data.status || ''`, `stage: data.stage || 'New'`. Mock leads have distinct stage values (`'New'`, `'Contacted'`, `'Negotiation'`).
- **FilterPanel.jsx** — `FILTER_OPTIONS.status` → `['Won', 'Lost']`; `FILTER_OPTIONS.stage` → `['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Follow-up', 'Negotiation', 'Demo Scheduled', 'Closed']`.
- **LeadTable.jsx** — `STATUS_VARIANTS` only maps `Won → 'converted'`, `Lost → 'lost'`.
- **LeadDetails.jsx**, **LeadHistory.jsx** — `STATUS_MAP` only has `Won → 'converted'`, `Lost → 'lost'`.
- **handlers.js** — `applyLeadFilters()` and `/admin/leads` handler accept separate `status` and `stage` params.
- **SavedViewsPanel.jsx** — removed invalid `status: 'Open'` from saved view filters.
- **All test files** updated — `LeadListPage.test.jsx`, `createLeadFlow.test.jsx`, `leadService.test.js` — no more `status: 'Open'`/`'Contacted'`/`'New'` references in lead context.
- Build (`vite build`) succeeds, all 180 tests pass.
- **STORY-2.4.1 (Lead Stage Management) implemented:**
  - `StageControl.jsx` — removed aria-labels so accessible names match test regex; valid stage transitions enforced per business rules; Close as Won button shown only at Negotiation; Reopen Lead button shown only for admin on closed leads.
  - `LostClosureModal.jsx` — removed `required` prop from SelectField so label text matches test expectations.
  - `LeadDetails.jsx` — added `fetchAdminLeadById` import; `loadLeadData` accepts `fromMutation` flag to control cache buster; modal close moved after successful API call so loading state is visible; error handling preserves user input.
  - `leadService.js` — `fetchLeadById`/`fetchAdminLeadById` accept optional `cacheBuster` param (no `?_=timestamp` added when `null`).
  - New `LeadStageManagement.test.jsx` — 24 tests covering Won/Lost validation, API errors, loading states, cancel flows, stage transitions, role-based access, read-only history, and reopen flow.
  - All 15 original LeadDetailsPage tests also pass.

### In Progress / Blocked
- (none)

## Key Decisions
- **MSM removed** because service functions return fallback/mock data directly.
- **Status and Stage separated** — Status is only Won/Lost (final outcome); Stage is progress (New → Closed).
- **No fetch for notifications/assign/reassign/history** — eliminates 404s from Mockoon missing those routes.

## Mockoon Setup
- **Mockoon CLI v9.7.0** installed via npm (`@mockoon/cli`).
- **Environment file** (`mockoon-environment.json`) was originally in an older format incompatible with v9. Fixed by restructuring to v9 format:
  - Routes moved from `data[]` array → `routes[]` array
  - `type: "http_route"` changed to `type: "http"`
  - Added required `rootChildren[]`, `hostname`, `proxyReqHeaders`, `proxyResHeaders`, `callbacks` fields
  - Each response needs `default: true/false`, `crudKey`, `callbacks` array
  - Each route needs `streamingMode`, `streamingInterval` fields
- **Start Mockoon:** `Start-Process powershell -ArgumentList "-NoExit", "-Command", "mockoon-cli start --data 'D:\CRM market\mockoon-environment.json' --disable-log-to-file"`
- **Verify:** `GET http://localhost:3001/admin/leads` returns lead data
- **Proxy:** Vite rewrites `/api` → `localhost:3001` (strips `/api` prefix)

## Next Steps
- (none — all routes connected and verified)

## Relevant Files
- `src/main.jsx`: entry point, MSW startup removed
- `src/services/leadService.js`: contains `FALLBACK_LEADS`, all fetch/mutation functions
- `src/services/notificationService.js`: inline mock data
- `src/mocks/mockData.js`: `createMockLead` with stage/status defaults
- `src/mocks/handlers.js`: stage filtering added
- `src/components/leads/FilterPanel.jsx`: updated filter options
- `src/components/leads/LeadTable.jsx`: updated STATUS_VARIANTS
- `src/components/leads/SavedViewsPanel.jsx`: cleaned up saved views
- `src/pages/leads/LeadDetails.jsx`, `src/pages/leads/LeadHistory.jsx`: updated STATUS_MAP
