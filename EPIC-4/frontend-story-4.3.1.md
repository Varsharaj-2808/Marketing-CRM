# EPIC-4: Follow-up Management — Frontend Test Cases (STORY-4.3.1: Lead Activity Timeline)

> **Epic Goal:** Allow Marketing Executives to log follow-up activities against leads and maintain an auditable interaction history.
> **Story Goal:** As any user with lead access, I want to see a single chronological timeline combining creation, assignment, stage changes, and follow-ups so that I understand the full lead story at a glance.
> **Tech Stack:** React (Vite) / TailwindCSS / Vitest / React Testing Library
> **Total Test Cases:** 24

---

## Table of Contents
1. [Consolidated Timeline UI & Layout](#1-consolidated-timeline-ui--layout)
2. [Event Filtering Chips](#2-event-filtering-chips)
3. [Immutability (Read-Only / Append-Only Feed)](#3-immutability-read-only--append-only-feed)
4. [Pagination (Load More Controls)](#4-pagination-load-more-controls)
5. [Accessibility (a11y)](#5-accessibility-a11y)
6. [Resilience, State & Edge Cases](#6-resilience-state--edge-cases)

---

## 1. Consolidated Timeline UI & Layout

**Test ID**
test-ep-4.3.1-f-001

**Category**
Consolidated Timeline UI & Layout

**Description**
Verify that the consolidated vertical chronological timeline renders on the Lead Detail page.

**Preconditions**
1. User is logged in as a Marketing Executive.
2. User navigates to the Lead Details page `/marketing/leads/{leadId}`.
3. API returns 4 events: Created, Assigned, Status Change, and Follow-up.

**Input / Steps**
1. Locate the Timeline section on the page.
2. Observe the layout.

**Expected Result**
1. The timeline section displays a vertical track/feed line.
2. Exactly 4 timeline event cards are displayed.
3. Cards are ordered in descending chronological order (newest first).
4. Each event card displays:
   - Event Date/Time (e.g. "July 6, 2026, 12:00 PM")
   - Actor Name (e.g. "by John Doe")
   - A clear description of the activity (e.g., "Status changed from New to Contacted").

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-89, C1-90

---

**Test ID**
test-ep-4.3.1-f-002

**Category**
Consolidated Timeline UI & Layout

**Description**
Verify that timeline events render with distinct icons and colors per event type.

**Preconditions**
1. Timeline section is loaded.

**Input / Steps**
1. Observe the visual style of icons on the timeline nodes.

**Expected Result**
1. "Created" event node displays a purple badge with a plus (+) icon.
2. "Assigned" event node displays a grey badge with a user avatar/person icon.
3. "Status Change" event node displays an orange badge with a forward arrow (->) icon.
4. "Follow-up" event node displays a blue badge with a phone receiver icon.
5. All icons render clean vector SVGs.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-89, C1-91

---

**Test ID**
test-ep-4.3.1-f-003

**Category**
Consolidated Timeline UI & Layout

**Description**
Verify that each card renders notes/descriptions properly with relative timestamp descriptors.

**Preconditions**
1. Timeline is loaded.
2. Current time is 2 hours past Event A.

**Input / Steps**
1. Inspect the metadata tags on Event A card.

**Expected Result**
1. The relative time descriptor shows "2 hours ago".
2. Hovering over the text displays a tooltip with the absolute date and time string in local time format.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-89, C1-90

---

**Test ID**
test-ep-4.3.1-f-004

**Category**
Consolidated Timeline UI & Layout

**Description**
Verify that long notes inside timeline follow-up events support expanding text inline.

**Preconditions**
1. Follow-up timeline event notes contain 250 characters.

**Input / Steps**
1. Observe the card notes.
2. Click "Show more".

**Expected Result**
1. The notes display in truncated format (up to ~100 characters) with a "Show more" link.
2. Clicking "Show more" expands the full 250 characters text in-place.
3. An active scroll is not generated inside the card.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-89

---

## 2. Event Filtering Chips

**Test ID**
test-ep-4.3.1-f-005

**Category**
Event Filtering Chips

**Description**
Verify that filter chips are rendered and active on the timeline section.

**Preconditions**
1. Timeline is rendered.

**Input / Steps**
1. Observe the timeline filter bar.

**Expected Result**
1. Four filter chips are rendered at the top of the feed: "All", "Follow-ups", "Stage Changes", and "Assignments".
2. The "All" chip is active by default, highlighted with a primary brand background.
3. Clicking other chips changes focus styles.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-92

---

**Test ID**
test-ep-4.3.1-f-006

**Category**
Event Filtering Chips

**Description**
Verify that clicking the "Follow-ups" chip updates the timeline to display only follow-up events, preserving descending order.

**Preconditions**
1. Timeline has 10 total events of mixed types.
2. Active user is ME.

**Input / Steps**
1. Click the "Follow-ups" filter chip.
2. Observe the list.

**Expected Result**
1. The UI dispatches `GET /marketing/leads/{leadId}/timeline?type=followup`.
2. The timeline displays only follow-up cards.
3. Stage changes, creation, and assignment items are hidden.
4. Ordering remains descending chronological.
5. The "Follow-ups" chip is highlighted.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-92

---

**Test ID**
test-ep-4.3.1-f-007

**Category**
Event Filtering Chips

**Description**
Verify that clicking the "All" chip restores the full chronological timeline feed.

**Preconditions**
1. Timeline filter "Follow-ups" is active (showing filtered events).

**Input / Steps**
1. Click the "All" filter chip.
2. Observe the list.

**Expected Result**
1. The UI dispatches `GET /marketing/leads/{leadId}/timeline` (without filter parameters).
2. The full timeline displaying all event types is restored.
3. The "All" chip is highlighted.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-92

---

**Test ID**
test-ep-4.3.1-f-008

**Category**
Event Filtering Chips

**Description**
Verify that timeline updates cleanly when selecting other filter chips like "Stage Changes" or "Assignments".

**Preconditions**
1. Timeline rendered.

**Input / Steps**
1. Click the "Stage Changes" chip.
2. Click the "Assignments" chip.

**Expected Result**
1. Selecting "Stage Changes" filters timeline to status transitions (`GET ...?type=status_change`).
2. Selecting "Assignments" filters timeline to assignment logs (`GET ...?type=assigned`).
3. Loading indicators run briefly during the filtering transitions.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-92

---

## 3. Immutability (Read-Only / Append-Only Feed)

**Test ID**
test-ep-4.3.1-f-009

**Category**
Immutability

**Description**
Verify that no UI controls to edit or delete events are rendered on timeline cards for any role.

**Preconditions**
1. User logged in as Admin `admin-001`.
2. Timeline is loaded with multiple events.

**Input / Steps**
1. Inspect each card on the timeline (Created, Status Change, Follow-up).
2. Hover over card areas.
3. Check for the presence of three-dot actions menu, trash icons, or edit link buttons.

**Expected Result**
1. There are zero edit or delete action items on any timeline card.
2. Hovering does not reveal editing controls.
3. Double clicking elements does not prompt inputs.
4. The timeline remains display-only for Admins and Marketing Executives.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-93

---

## 4. Pagination (Load More Controls)

**Test ID**
test-ep-4.3.1-f-010

**Category**
Pagination

**Description**
Verify that a lead with more than 20 timeline events loads only the most recent 20 initially, with a "Load more" button visible.

**Preconditions**
1. Lead A has 25 total events.
2. API initially returns 20 events on page 1 with metadata `hasMore: true`.

**Input / Steps**
1. View the timeline feed.
2. Scroll to the bottom of the section.

**Expected Result**
1. Exactly 20 event cards are visible on initial mount.
2. A "Load more" button is rendered at the bottom of the timeline list.
3. No scrollbars are forced inside the widget containers.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-94

---

**Test ID**
test-ep-4.3.1-f-011

**Category**
Pagination

**Description**
Verify that clicking "Load more" appends the next batch of events to the bottom of the timeline.

**Preconditions**
1. Initial page loaded with 20 items.
2. Load more button is visible.
3. API response page 2 is mocked to return the remaining 5 items.

**Input / Steps**
1. Click the "Load more" button.
2. Observe the timeline list.

**Expected Result**
1. Clicking "Load more" displays a loading spinner inside the button.
2. The remaining 5 items are retrieved and appended to the bottom.
3. Total of 25 cards are now visible.
4. The "Load more" button is hidden since all events have been loaded.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-94

---

**Test ID**
test-ep-4.3.1-f-012

**Category**
Pagination

**Description**
Verify that the "Load more" button is not rendered when a lead has 20 or fewer timeline events.

**Preconditions**
1. Lead A has exactly 15 timeline events.
2. API response metadata: `hasMore: false`.

**Input / Steps**
1. Navigate to Lead Detail page.
2. Scroll to the bottom of the timeline.

**Expected Result**
1. All 15 cards are loaded.
2. No "Load more" button is rendered at the bottom.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-94

---

## 5. Accessibility (a11y)

**Test ID**
test-ep-4.3.1-f-013

**Category**
Accessibility (a11y)

**Description**
Verify keyboard navigation through the timeline filters and pagination.

**Preconditions**
1. Lead Detail page is open.
2. Focus is in the page header.

**Input / Steps**
1. Press Tab to navigate to the filter chips.
2. Press Tab to cycle through filters and "Load more" buttons.
3. Select "Stage Changes" using space/Enter.

**Expected Result**
1. Logical tab sequence: All -> Follow-ups -> Stage Changes -> Assignments -> (Timeline cards if interactive) -> Load more.
2. Active elements highlight with a focus ring.
3. Pressing Enter on "Stage Changes" activates the filter.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.3.1, C1-92, C1-94

---

**Test ID**
test-ep-4.3.1-f-014

**Category**
Accessibility (a11y)

**Description**
Verify screen reader labels on event icons.

**Preconditions**
1. Screen reader active.

**Input / Steps**
1. Navigate to the visual node icons on the timeline timeline track.

**Expected Result**
1. Icons include hidden accessibility texts or ARIA labels:
   - Call icon: `aria-label="Follow-up Call event"`
   - Stage change arrow: `aria-label="Status update event"`
   - Plus icon: `aria-label="Creation event"`
2. Screen readers read the label instead of skips or raw SVG code outputs.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.3.1, C1-89, C1-91

---

**Test ID**
test-ep-4.3.1-f-015

**Category**
Accessibility (a11y)

**Description**
Verify that all color-coded badges and tags pass WCAG AA contrast ratio parameters.

**Preconditions**
1. Nodes are colored (orange, grey, purple, blue).

**Input / Steps**
1. Run automated a11y color checks on the timeline badge texts and node borders.

**Expected Result**
1. All elements meet the 4.5:1 WCAG 2.1 AA threshold.
2. The icons and color codes are supplementary; the text content explicitly conveys the event type.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.3.1, C1-89, C1-91

---

## 6. Resilience, State & Edge Cases

**Test ID**
test-ep-4.3.1-f-016

**Category**
Resilience, State & Edge Cases

**Description**
Verify that creating a follow-up immediately prepends the new event to the top of the timeline.

**Preconditions**
1. Form modal is open.
2. Timeline is currently showing 5 items.

**Input / Steps**
1. Fill form and click Submit.
2. View the timeline once success toast disappears.

**Expected Result**
1. The timeline triggers a refetch of page 1.
2. The newly created follow-up is immediately visible as the very first card at the top.
3. Total item count updates to 6.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-017

**Category**
Resilience, State & Edge Cases

**Description**
Verify UI behavior when the timeline API returns a 500 error on page load.

**Preconditions**
1. API `GET /marketing/leads/{id}/timeline` returns 500.

**Input / Steps**
1. Navigate to Lead Detail page.
2. Observe the timeline container.

**Expected Result**
1. An inline error box is rendered: "Failed to load timeline history."
2. A "Try again" link button is provided to re-trigger the fetch.
3. The rest of the Lead Details page (lead profile header) remains visible and interactive.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-018

**Category**
Resilience, State & Edge Cases

**Description**
Verify skeleton loads display during timeline page shifts.

**Preconditions**
1. User clicks "Stage Changes" filter chip.
2. Request has a 1s delay.

**Input / Steps**
1. Click the chip.
2. Observe layout before response.

**Expected Result**
1. The current list fades out, and pulsing grey card skeletons are rendered.
2. Once resolved, skeletons are replaced with the filtered status change list.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-f-019

**Category**
Resilience, State & Edge Cases

**Description**
Verify browser refresh does not clear or alter timeline sort order.

**Preconditions**
1. User is on Lead Details page, timeline is fully loaded.

**Input / Steps**
1. Press refresh (F5).

**Expected Result**
1. The page reloads.
2. The timeline fetches correctly and renders the cards in the exact same descending chronological order.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-020

**Category**
Resilience, State & Edge Cases

**Description**
Verify that a new assignment event appears on the timeline immediately after reassigning a lead.

**Preconditions**
1. User is logged in as Admin.
2. Click "Assign Lead" dropdown.

**Input / Steps**
1. Change assignee from John Doe to Jane Smith.
2. Observe the timeline.

**Expected Result**
1. Success message is shown.
2. A new timeline event is appended at the top: "Lead reassigned from John Doe to Jane Smith by Admin." styled with a grey avatar icon.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-021

**Category**
Resilience, State & Edge Cases

**Description**
Verify empty timeline state display.

**Preconditions**
1. API timeline data returns empty array `[]`.

**Input / Steps**
1. View the timeline container.

**Expected Result**
1. The section displays: "No history found for this lead."
2. The vertical feed line is hidden.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-022

**Category**
Resilience, State & Edge Cases

**Description**
Verify that clicking "Load more" shifts keyboard focus to the first newly appended timeline card.

**Preconditions**
1. Tabbing is locked on "Load more" button.
2. User clicks Enter.

**Input / Steps**
1. Press Enter on "Load more".

**Expected Result**
1. The next page loads.
2. Keyboard focus is programmatically shifted from the "Load more" button to the header of the 21st timeline card (the first card of the new batch), providing a smooth experience for screen reader users.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.3.1, C1-94

---

**Test ID**
test-ep-4.3.1-f-023

**Category**
Resilience, State & Edge Cases

**Description**
Verify offline behavior: timeline loads cached history if connection is lost.

**Preconditions**
1. App is loaded, timeline is cached.
2. Connection goes offline.

**Input / Steps**
1. Click the "Follow-ups" filter chip while offline.

**Expected Result**
1. The UI blocks the API request.
2. A banner appears: "Offline: Cannot filter timeline while offline."
3. The previously loaded timeline remains visible.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-f-024

**Category**
Resilience, State & Edge Cases

**Description**
Verify race condition cancelation if user switches filters rapidly.

**Preconditions**
1. Slow network connectivity.

**Input / Steps**
1. Rapidly click "Follow-ups", then "Stage Changes", then "Assignments" within 500ms.

**Expected Result**
1. The app cancels previous outgoing HTTP requests using abort signals.
2. The UI only renders the results of the "Assignments" query (the last clicked action) to prevent rendering jumps.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

## Final Review Metrics

1. **Total Number of Test Cases:** 24 test cases (`test-ep-4.3.1-f-001` through `test-ep-4.3.1-f-024`).
2. **Coverage Summary:** 100% test coverage across all story UI requirements:
   - Consolidated chronological vertical feed display, dates, creators, and actors.
   - Distinct icon/color badge nodes for Created, Assigned, Status Change, and Follow-up events.
   - Filter chips behavior (All, Follow-ups, Stage Changes, Assignments).
   - Absolute and relative time conversions, long note truncation and inline expansions.
   - Complete read-only verification (no delete/edit menus or context actions anywhere).
   - Paged loading (20 max initial, "Load more" spinners, focus wrapping).
   - a11y specifications (keyboard cycling, screen reader aria attributes, color contrast standards).
   - Frontend resilience (live prepends on saves, error boundary cards, loader skeletons, tab focus redirects, and concurrency race control aborts).
3. **Traceability Summary:** Maps to requirements defined in STORY-4.3.1, C1-89, C1-90, C1-91, C1-92, C1-93, C1-94, AC1, AC2, AC3, and AC4.
