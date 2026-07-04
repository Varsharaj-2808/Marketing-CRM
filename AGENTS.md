## Goal
- Implement STORY-2.3.1 (Lead Assignment & Reassignment) frontend only, then separate Status (Won/Lost) from Stage (progress stages) in lead filters, then implement EPIC-3-Story-1 (Category/Sub-Category Master CRUD).

## Constraints & Preferences
- React (Vite), JSX, Tailwind CSS, React Router, raw `fetch`.
- No backend, no database — Mockoon on `localhost:3001`, Vite proxy rewrites `/api` → `3001` stripping `/api`.
- All existing features must remain intact; 244 existing tests must pass.

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
  - `StageControl.jsx` — `STAGE_TRANSITIONS` now matches TASK-2.4.1-01 spec (linear pipeline: `New→Contacted→Meeting Scheduled→Requirement Gathering→Proposal Sent→Negotiation→Won/Lost/Hold`). `Closed→[]` added. Fallback for unknown stages changed to `[]`. Close as Won shown only at Negotiation; Reopen shown only for admin on closed leads. Stage selector enabled for admins on closed leads.
  - `SelectField.jsx` — `disabled` prop now passed to `<option>` elements so current-stage option is correctly disabled.
  - `LostClosureModal.jsx` — removed `required` prop from SelectField.
  - `LeadDetails.jsx` — `loadLeadData` accepts `fromMutation` flag; `handleStageChange` calls `updateLeadStage` then refreshes; Lost opens LostClosureModal, Won via "Close as Won" button.
  - `leadService.js` — all CRUD functions (lead sources, services, categories, sub-categories) wrapped in try/catch falling back to local objects on 502. `fetchLeadById`/`fetchAdminLeadById` accept optional `cacheBuster` param.
  - `LeadHistory.jsx` — pagination with Load More (5 initial, 5 per load).
  - **Tests** — 227 tests pass across LeadStageManagement (24), LeadDetailsPage (15), LeadAssignment, LeadListPage, and all unit tests.
- **EPIC-3-Story-1 (Category/Sub-Category Master CRUD) implemented:**
  - `mockData.js` — `isActive: true` added to all 5 categories and 17 sub-categories.
  - `handlers.js` — Category/sub-category CRUD handlers support `isActive`; new GET endpoints for active-only fetch (`/categories/active`, `/sub-categories/active`), in-use check (`/categories/:id/in-use`), audit log (`/categories/:id/audit-log`); 409 conflict on in-use delete; audit log entries for CREATE/UPDATE/DEACTIVATE/ACTIVATE/DELETE.
  - `leadService.js` — 7 new functions: `toggleCategoryStatus`, `toggleSubCategoryStatus`, `checkCategoryInUse`, `checkSubCategoryInUse`, `fetchActiveCategories`, `fetchActiveSubCategories`, `fetchCategoryAuditLog`.
  - `CategoriesPage.jsx` — Full rewrite: table with Active/Inactive badges, Add/Edit/Deactivate/Activate/Delete/Audit buttons, expandable sub-category rows with same actions, modal forms with validation, ConfirmDialog for delete, in-use error dialog, audit log modal with loading/empty/data states, Toast notifications, skeleton loading.
  - `CategoryDropdown.jsx`, `SubCategoryDropdown.jsx` — Filter to only `isActive !== false` items.
  - **Tests** — 244 tests pass (16 files), including 15 integration tests (`CategoriesPage.test.jsx`) and 2 E2E tests (`categoryMasterFlow.test.jsx`).

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
- `src/pages/admin/CategoriesPage.jsx`: rewritten — full Category/Sub-Category CRUD
- `src/components/leads/CategoryDropdown.jsx`: filters inactive items
- `src/components/leads/SubCategoryDropdown.jsx`: filters inactive items
- `src/tests/integration/CategoriesPage.test.jsx`: 15 new integration tests
- `src/tests/e2e/categoryMasterFlow.test.jsx`: 2 new E2E tests
- `implementation-summary.md`: complete implementation requirements mapping
