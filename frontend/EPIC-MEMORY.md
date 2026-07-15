# EPIC-MEMORY: STORY-4.3.1 Implementation Log

This document records the design, implementation, and verification details of **STORY-4.3.1: Lead Activity Timeline**.

---

## 1. STORY-4.3.1 Implementation Summary
* **Goal**: Provide a single consolidated, chronological vertical feed of lead events (Created, Assigned, Status Change, Follow-up) on the Lead Detail page.
* **Architecture**: Extended existing React components (`Timeline.jsx` and `LeadDetails.jsx`) to handle filtering, layout track lines, skeletons, error handling, focus shifting, and pagination. Mockoon endpoints were merged to enable contract testing without breaking previous stories.

---

## 2. UI Changes
* **Filter Chips Bar**: Rendered "All", "Follow-ups", "Stage Changes", and "Assignments" buttons at the top of the feed, highlighted with active focus ring styles.
* **Vertical track line**: Left border styling (`border-l-2 ml-4 pl-8`) drawn dynamically behind the cards (hidden when the list is empty).
* **Badge Layout**: Absolute badge positioning on the line track:
  * **Created**: Purple badge with plus (`add`) icon.
  * **Assigned**: Grey badge with person/avatar (`person`) icon.
  * **Status Change**: Orange badge with forward arrow (`arrow_forward`) icon.
  * **Follow-up**: Blue badge with phone receiver (`phone`) icon.
* **Relative Timestamp Descriptors**: Relative times rendered with local formatted absolute date/time tooltips on hover.
* **Long Notes Inline Expansion**: Truncates notes longer than 100 characters with a "Show more" button expanding content in-place.
* **Accessibility**: Unique HTML IDs, keyboard focus indicators, screen-reader-only labels on badge icons (`aria-label`), and tab sequence.

---

## 3. Components Created & Modified

### Components Created
* **None** (Reused and updated existing files to follow codebase patterns).

### Components Modified
1. **`src/components/leads/Timeline.jsx`**
   * Added `FILTER_CHIPS` and integrated chip filter button selection.
   * Restructured `TimelineCard` wrapper to support absolute badges, focus styling, and ARIA labels.
   * Rendered the vertical timeline line track when events exist.
   * Added screen-reader-only backward-compatibility support for the empty timeline message.
2. **`src/pages/leads/LeadDetails.jsx`**
   * Configured limit of 20 events.
   * Implemented state triggers for `activeFilter` and `timelineError`.
   * Added logic to shift keyboard focus to the first card of the new batch on pagination.
   * Handled timeline fetch failures by rendering an inline error box with a "Try again" trigger.
   * Blocked filtering calls in offline state with local toast warnings.

---

## 4. API Endpoints Implemented & Mockoon Routes

### Mockoon Routes Added (4 routes total)
1. `GET /admin/leads/:id/timeline` (3 scenarios: `TEST-EP4-FUP3-010` to `012`)
2. `PUT /marketing/leads/:id/timeline/:eventId` (2 scenarios: `TEST-EP4-FUP3-013` and `016` returning `405`)
3. `PATCH /marketing/leads/:id/timeline/:eventId` (2 scenarios: `TEST-EP4-FUP3-014` and `016` returning `405`)
4. `DELETE /marketing/leads/:id/timeline/:eventId` (2 scenarios: `TEST-EP4-FUP3-015` and `016` returning `405`)

### Existing APIs Updated
* **`GET /marketing/leads/:id/timeline`**
  * Appended **17 response scenarios** (`TEST-EP4-FUP3-001` to `TEST-EP4-FUP3-009`, and `TEST-EP4-FUP3-017` to `TEST-EP4-FUP3-024`).
  * Combined with existing STORY-4.1.1 scenarios (`TEST-EP4-FUP-029` to `040`) for a total of **29 response scenarios** coexisting on this route.

---

## 5. Validation Rules Implemented
Mockoon conditional rules mapped:
* **Authorization Headers**: Matches role-specific tokens (e.g. `Bearer me-fup3-token` for success, `Bearer me-002-token` for access denied, `Bearer admin-token` for admin access).
* **Regex URL Params**: Path UUID validation rule checks if parameter matches RFC-compliant UUID structure.
* **SQL Injection / Security Triggers**: Sanitization rules match keywords (`DROP`, `--`, `'`) in filter/limit query strings.

---

## 6. Test Scenarios Covered
Fully implements all **24 frontend test cases** (`test-ep-4.3.1-f-001` to `024`) defined in `frontend-story-4.3.1.md`.
Verified with the Vitest suite: 19 test files passed, 400/400 tests passed successfully.
