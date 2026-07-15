## Goal
- Implement STORY-2.3.1 (Lead Assignment & Reassignment) frontend only, then separate Status (Won/Lost) from Stage (progress stages) in lead filters, then implement EPIC-3-Story-1 (Category/Sub-Category Master CRUD), then implement STORY-4.1.1 (Follow-up Management) tests.

## Constraints & Preferences
- React (Vite), JSX, Tailwind CSS, React Router, raw `fetch`.
- No backend, no database — Mockoon on `localhost:3001`, Vite proxy rewrites `/api` → `3001` stripping `/api`.
- All existing features must remain intact; all tests must pass.

## Progress
### Done
- **MSW removed** from entry point — `main.jsx` uses synchronous `ReactDOM.createRoot.render()`, no MSW startup.
- **`notificationService.js`** — no fetch calls. `fetchNotifications()` returns 3 mock notifications inline; `markNotificationRead()` returns `{ success: true }`.
- **`leadService.js`** — added `FALLBACK_LEADS` (3 leads) with `status: '', stage: '...'` model. All CRUD functions wrapped in try/catch falling back to local objects on 502. `fetchLeadById`/`fetchAdminLeadById` accept optional `cacheBuster` param.
- **`createMockLead`** (`mockData.js`) defaults `status: data.status || ''`, `stage: data.stage || 'New'`.
- **FilterPanel.jsx** — `FILTER_OPTIONS.status` → `['Won', 'Lost']`; `FILTER_OPTIONS.stage` → `['New', ..., 'Closed']`.
- **LeadTable.jsx** — `STATUS_VARIANTS` only maps `Won → 'converted'`, `Lost → 'lost'`.
- **LeadDetails.jsx**, **LeadHistory.jsx** — `STATUS_MAP` only has `Won → 'converted'`, `Lost → 'lost'`.
- **handlers.js** — `applyLeadFilters()` and `/admin/leads` handler accept separate `status` and `stage` params.
- **SavedViewsPanel.jsx** — removed invalid `status: 'Open'` from saved view filters.
- **Status and Stage separated** — Status is only Won/Lost (final outcome); Stage is progress (New → Closed).
- **STORY-2.4.1 (Lead Stage Management) implemented** — `StageControl.jsx` linear pipeline, stage transitions, Lost/Won/Reopen modals.
- **EPIC-3-Story-1 (Category/Sub-Category Master CRUD) implemented** — full CRUD with active/inactive, audit log, in-use checks.
- **STORY-4.1.1 (Follow-up Management) test file** — `LeadFollowUpPage.test.jsx` with 72 tests across 11 categories.
- **Total tests**: 374 pass across 18 test files.

## Key Decisions
- **MSM removed** because service functions return fallback/mock data directly.
- **Status and Stage separated** — Status is only Won/Lost (final outcome); Stage is progress (New → Closed).
- **No fetch for notifications/assign/reassign/history** — eliminates 404s from Mockoon missing those routes.
- **FollowUpModal type dropdown** renders split-character spans via `t.label.split(/(?:)/gi)` when `typeSearch` is empty; test selectors use `getAllByRole('option')` + `textContent.includes` for reliability.
- **Global `vi.useFakeTimers` avoided** (breaks React 18 async rendering); isolated only for f-037 (10s timeout) with `shouldAdvanceTime: true`.

## Mockoon Setup
- **Mockoon CLI v9.7.0** installed via npm (`@mockoon/cli`).
- **Environment file** (`mockoon-environment.json`) was originally in an older format incompatible with v9. Fixed by restructuring to v9 format.
- **Start Mockoon:** `Start-Process powershell -ArgumentList "-NoExit", "-Command", "mockoon-cli start --data 'D:\CRM market\mockoon-environment.json' --disable-log-to-file"`
- **Verify:** `GET http://localhost:3001/admin/leads` returns lead data
- **Proxy:** Vite rewrites `/api` → `localhost:3001` (strips `/api` prefix)

## Next Steps
- (none — all 374 tests pass)

## Relevant Files
- `src/tests/integration/LeadFollowUpPage.test.jsx`: 72 tests for STORY-4.1.1
- `src/components/leads/FollowUpModal.jsx`: follow-up form with type dropdown
- `src/components/leads/Timeline.jsx`: timeline cards with correction UI
- `src/pages/leads/LeadDetails.jsx`: orchestrates modal open/close, timeline, corrections
- `src/services/leadService.js`: `fetchTimeline`, `addCorrection`, `parseProposalAmount`
- `src/main.jsx`: entry point, MSW startup removed
- `src/pages/admin/CategoriesPage.jsx`: Category/Sub-Category CRUD
- `src/components/leads/CategoryDropdown.jsx`, `SubCategoryDropdown.jsx`: filters inactive items
- `implementation-summary.md`: implementation requirements mapping
