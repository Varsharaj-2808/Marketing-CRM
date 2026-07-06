# EPIC-4: Follow-up Management — Frontend Test Cases (STORY-4.2.1: View Today's and Overdue Follow-ups)

> **Epic Goal:** Allow Marketing Executives to log follow-up activities against leads and maintain an auditable interaction history.
> **Story Goal:** As a Marketing Executive, I want to see today's and overdue follow-ups so that no opportunity is missed.
> **Tech Stack:** React (Vite) / TailwindCSS / Vitest / React Testing Library
> **Total Test Cases:** 23

---

## Table of Contents
1. [ME Dashboard Widgets ('Follow-ups Today' & 'Overdue Follow-ups')](#1-me-dashboard-widgets-follow-ups-today--overdue-follow-ups)
2. [Lead List Overdue Indicators (Red Flags)](#2-lead-list-overdue-indicators-red-flags)
3. [Admin Dashboard 'At Risk' Widget](#3-admin-dashboard-at-risk-widget)
4. [In-App Reminder Notifications](#4-in-app-reminder-notifications)
5. [Accessibility (a11y)](#5-accessibility-a11y)
6. [Resilience, Cache & Edge Cases](#6-resilience-cache--edge-cases)

---

## 1. ME Dashboard Widgets ('Follow-ups Today' & 'Overdue Follow-ups')

**Test ID**
test-ep-4.2.1-f-001

**Category**
ME Dashboard Widgets

**Description**
Verify that the "Follow-ups Today" widget on the Marketing Executive dashboard displays the list of leads due today, sorted by quality (Hot > Warm > Cold).

**Preconditions**
1. User logged in as a Marketing Executive.
2. User is on the Marketing Dashboard page (`/marketing/dashboard`).
3. API `GET /marketing/followups/today` returns 3 leads: Lead A (Hot), Lead B (Cold), Lead C (Warm).

**Input / Steps**
1. Observe the "Follow-ups Today" widget container.
2. Inspect the order of the leads in the list.

**Expected Result**
1. The widget displays the title "Follow-ups Today" with a badge showing count "3".
2. Three lead cards are rendered in the list.
3. The leads are ordered correctly: Lead A (Hot) first, Lead C (Warm) second, Lead B (Cold) third.
4. Each card displays: Company Name, Contact Person, and a color-coded Quality Tag.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-f-002

**Category**
ME Dashboard Widgets

**Description**
Verify that the "Overdue Follow-ups" widget displays past-due leads with their corresponding overdue duration.

**Preconditions**
1. User logged in as a Marketing Executive.
2. API `GET /marketing/followups/overdue` returns 2 leads: Lead A (2 days overdue) and Lead B (5 days overdue).

**Input / Steps**
1. Observe the "Overdue Follow-ups" widget container.

**Expected Result**
1. The widget displays the title "Overdue Follow-ups" with a badge showing count "2".
2. Two lead cards are rendered in the list.
3. Lead B (5 days overdue) is rendered above Lead A (2 days overdue) since the list is sorted by most overdue first.
4. Each card contains a clear overdue indicator, e.g., "5 days overdue" and "2 days overdue" styled in red text.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-f-003

**Category**
ME Dashboard Widgets

**Description**
Verify that clicking a lead card in either dashboard widget navigates the user to the corresponding Lead Details page.

**Preconditions**
1. User is on the dashboard.
2. Widgets display active lead items.

**Input / Steps**
1. Click on a lead card (Lead ID: `LD-2026-00042`) inside the "Follow-ups Today" widget.
2. Go back to the dashboard, and click on a lead card inside the "Overdue Follow-ups" widget.

**Expected Result**
1. Clicking either card navigates the browser immediately to the details page: `/marketing/leads/LD-2026-00042`.
2. The page loads the correct lead profile.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

**Test ID**
test-ep-4.2.1-f-004

**Category**
ME Dashboard Widgets

**Description**
Verify empty state displays when there are no follow-ups due today or overdue.

**Preconditions**
1. API endpoints `/marketing/followups/today` and `/marketing/followups/overdue` both return empty data arrays `[]`.

**Input / Steps**
1. View the dashboard widgets.

**Expected Result**
1. "Follow-ups Today" widget displays: "All caught up! No follow-ups scheduled for today." with a green check icon.
2. "Overdue Follow-ups" widget displays: "No overdue tasks. Good job!" with a validation illustration.
3. Count badges for both widgets display "0".

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

**Test ID**
test-ep-4.2.1-f-005

**Category**
ME Dashboard Widgets

**Description**
Verify skeleton loading states are displayed during active fetch requests.

**Preconditions**
1. GET requests for dashboard endpoints have a simulated network delay of 1500ms.

**Input / Steps**
1. Load the dashboard page `/marketing/dashboard`.
2. Observe the widgets before the API responses resolve.

**Expected Result**
1. Pulse-animated loading skeletons (empty grey blocks) are rendered in place of the widget content lists.
2. Skeletons disappear and are replaced with real data cards immediately after responses resolve.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

**Test ID**
test-ep-4.2.1-f-006

**Category**
ME Dashboard Widgets

**Description**
Verify widgets gracefully handle and display error states if the backend API returns a server failure.

**Preconditions**
1. API `/marketing/followups/today` returns HTTP 500.

**Input / Steps**
1. Load the dashboard.
2. Observe the today's follow-up widget.
3. Click the "Retry" button.

**Expected Result**
1. The widget displays an error state card: "Failed to load today's follow-ups." along with a "Retry" button.
2. Clicking "Retry" triggers a fresh GET request to the endpoint.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.2.1, C1-84

---

## 2. Lead List Overdue Indicators (Red Flags)

**Test ID**
test-ep-4.2.1-f-007

**Category**
Lead List Overdue Indicators

**Description**
Verify that a red "Overdue" flag/badge is displayed next to past-due leads in the Lead List table.

**Preconditions**
1. User is on `/marketing/leads`.
2. Active Lead A has `next_followup_date` in the past (e.g. yesterday).
3. Active Lead B has `next_followup_date` set to today or a future date.

**Input / Steps**
1. Observe the Lead List table columns.

**Expected Result**
1. Lead A's row displays a highly visible red badge in the "Next Follow-up" column containing the text "Overdue" or the overdue days count (e.g. "Overdue (1d)").
2. Lead B displays its formatted date/time normally (e.g. "Today, 4:00 PM" or "Jul 10, 2026") without any red styling or overdue warnings.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-f-008

**Category**
Lead List Overdue Indicators

**Description**
Verify that the Overdue red flag is removed instantly from a lead once a new follow-up is successfully logged.

**Preconditions**
1. Lead A is marked "Overdue" in the list.
2. User is on Lead A's Details page.

**Input / Steps**
1. Open "Log Follow-up" form, enter valid data (Outcome: "Interested", Next Date: 5 days in future).
2. Click "Submit".
3. Navigate back to the Lead List page.

**Expected Result**
1. The follow-up is successfully saved.
2. Returning to the Lead List page, Lead A no longer displays the red "Overdue" flag.
3. The date displayed in the "Next Follow-up" column reflects the new scheduled date (e.g. 5 days in future).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-f-009

**Category**
Lead List Overdue Indicators

**Description**
Verify that the Overdue red flag is removed instantly from a lead once the lead is closed (Won/Lost).

**Preconditions**
1. Lead A is overdue.
2. User is on Lead A's details page.

**Input / Steps**
1. Click "Close Lead" button.
2. Close Lead A as "Lost" (Reason: "Budget").
3. Navigate back to the Lead List.

**Expected Result**
1. Lead status changes to "Lost".
2. In the Lead List, Lead A has no red "Overdue" flag, and its row reflects a closed status style (e.g., dimmed/grey text).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-f-010

**Category**
Lead List Overdue Indicators

**Description**
Verify boundary condition: a lead with next_followup_date set to today is not flagged as overdue.

**Preconditions**
1. Today's date is July 6, 2026.
2. Lead A has `next_followup_date` = "2026-07-06T18:00:00Z" (today).

**Input / Steps**
1. View Lead List.

**Expected Result**
1. Lead A's row shows "Today, 6:00 PM".
2. No red "Overdue" tag is rendered on the row.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-85

---

## 3. Admin Dashboard 'At Risk' Widget

**Test ID**
test-ep-4.2.1-f-011

**Category**
Admin At Risk Widget

**Description**
Verify that the Admin Dashboard's "At Risk" widget correctly displays leads overdue by 3 or more calendar days, showing lead details, owner, and days overdue.

**Preconditions**
1. User logged in is Admin.
2. User is on the Admin Dashboard page (`/admin/dashboard`).
3. API `GET /admin/dashboard/at-risk` returns:
   - Lead A: Owner "John Doe", 5 days overdue.
   - Lead B: Owner "Jane Smith", 3 days overdue.

**Input / Steps**
1. Locate and inspect the "At Risk Follow-ups" widget.

**Expected Result**
1. The widget renders with title "At Risk Follow-ups".
2. Two row items are displayed:
   - Row 1: Lead A, Owner: John Doe, Indicator: "5 days overdue" (colored red).
   - Row 2: Lead B, Owner: Jane Smith, Indicator: "3 days overdue" (colored red).
3. Leads are sorted descending by overdue duration (5 days > 3 days).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-f-012

**Category**
Admin At Risk Widget

**Description**
Verify that clicking an item in the "At Risk" widget navigates the Admin to that lead's details page.

**Preconditions**
1. User is logged in as Admin on `/admin/dashboard`.

**Input / Steps**
1. Click on Lead A's row inside the "At Risk" widget.

**Expected Result**
1. Browser navigates immediately to `/admin/leads/{leadId}`.
2. The page loads the full history and profile for the clicked lead.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-f-013

**Category**
Admin At Risk Widget

**Description**
Verify empty state representation inside the Admin At-Risk widget when no leads are overdue by 3+ days.

**Preconditions**
1. API `GET /admin/dashboard/at-risk` returns `data: {total_at_risk: 0, leads: []}`.

**Input / Steps**
1. Inspect the "At Risk" widget container.

**Expected Result**
1. The widget displays the count "0".
2. Inner text displays: "No leads are currently at risk. All follow-ups are on track."

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-f-014

**Category**
Admin At Risk Widget

**Description**
Verify that a standard Marketing Executive user cannot access the Admin Dashboard or view the At Risk widget.

**Preconditions**
1. User logged in has "Marketing" role (non-admin).

**Input / Steps**
1. Attempt to navigate directly to the URL `/admin/dashboard`.

**Expected Result**
1. Access is blocked.
2. App displays a 403 Access Denied unauthorized page or redirects back to `/marketing/leads`.
3. The Admin sidebar navigation links are not rendered in the UI layout.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-87

---

## 4. In-App Reminder Notifications

**Test ID**
test-ep-4.2.1-f-015

**Category**
In-App Reminder Notifications

**Description**
Verify that an unread notification count badge is displayed on the header's notification bell icon.

**Preconditions**
1. User is logged in as ME on any page.
2. GET `/notifications` returns 3 unread items.

**Input / Steps**
1. Look at the header's notification bell icon.

**Expected Result**
1. A red circle badge displays the number "3" overlaying the bell icon.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-f-016

**Category**
In-App Reminder Notifications

**Description**
Verify that clicking the bell icon opens a dropdown panel containing unread follow-up reminder list items.

**Preconditions**
1. Unread count badge is visible.

**Input / Steps**
1. Click the notification bell icon.

**Expected Result**
1. A dropdown panel opens below the bell icon.
2. The panel lists the 3 unread notification cards.
3. Each card displays a clear reminder text: e.g. "Reminder: Follow-up is due today for Acme Corp (Hot)." along with a clock icon.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-86

---

## 5. Accessibility (a11y)

**Test ID**
test-ep-4.2.1-f-017

**Category**
Accessibility (a11y)

**Description**
Verify keyboard accessibility for the notification dropdown panel.

**Preconditions**
1. Focus is on the notification bell button.

**Input / Steps**
1. Press Enter to open the panel.
2. Press Tab to move focus inside the panel.
3. Focus a notification card and press Enter.

**Expected Result**
1. Pressing Enter opens the panel and sets focus to the first item (e.g. "Mark all as read" button).
2. Tabbing navigates sequentially through each notification link card inside the dropdown.
3. Pressing Enter on a focused notification triggers navigation to the lead details.
4. Pressing Escape closes the panel and returns focus to the bell button.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-f-018

**Category**
Accessibility (a11y)

**Description**
Verify that the red overdue indicator flags meet WCAG AA contrast ratio constraints.

**Preconditions**
1. Red text indicators ("Overdue", "At Risk") are displayed.

**Input / Steps**
1. Verify color contrast ratio of the red text/badge background against its container using a color contrast checker (e.g., axe-core).

**Expected Result**
1. Color contrast ratio is at least 4.5:1 (conforms to WCAG 2.1 Level AA requirements for normal text).
2. The color is not the sole indicator of state (accompanied by text "Overdue" or icon).

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.2.1, C1-85, C1-87

---

**Test ID**
test-ep-4.2.1-f-019

**Category**
Accessibility (a11y)

**Description**
Verify semantic accessibility helper attributes are rendered on the notification bell and overdue tags.

**Preconditions**
1. Notification bell badge contains unread counts.

**Input / Steps**
1. Inspect the HTML markup.

**Expected Result**
1. Bell button has `aria-haspopup="true"` and `aria-expanded="true/false"`.
2. Badge count container has `aria-label="3 unread notifications"`.
3. Overdue red badges include screen-reader fallback tags: e.g. `<span class="sr-only">Warning: Lead is overdue</span>`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-4.2.1, C1-85, C1-86

---

## 6. Resilience, Cache & Edge Cases

**Test ID**
test-ep-4.2.1-f-020

**Category**
Resilience, Cache & Edge Cases

**Description**
Verify that widget counts update immediately after logging a follow-up, ensuring no stale data caching.

**Preconditions**
1. Dashboard displays "Follow-ups Today: 1".
2. Lead A is in the today queue.
3. User opens Lead A details page and logs a new follow-up successfully.

**Input / Steps**
1. Log follow-up for Lead A (moves next date to 7 days in future).
2. Click back button to return to dashboard.

**Expected Result**
1. Today's follow-up list refetches or updates.
2. The widget count updates to "0", and Lead A is removed from the "Follow-ups Today" list immediately.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-f-021

**Category**
Resilience, Cache & Edge Cases

**Description**
Verify that browser refresh during notification read selection does not corrupt client routing state.

**Preconditions**
1. Click event triggered on notification card, routing underway.

**Input / Steps**
1. Trigger browser refresh (F5) immediately after clicking.

**Expected Result**
1. The application recovers gracefully, resolves the path, and loads the Lead Details profile correctly without displaying a blank page.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-f-022

**Category**
Resilience, Cache & Edge Cases

**Description**
Verify offline support: dashboard caching allows reading queues offline.

**Preconditions**
1. Application transitions to offline state (`navigator.onLine = false`).

**Input / Steps**
1. Navigate to dashboard `/marketing/dashboard`.

**Expected Result**
1. Dashboard loads last cached data from localStorage.
2. Offline banner is displayed: "You are currently offline. Viewing cached follow-up queues."
3. Interactive API buttons (e.g. Retry, Mark as Read) are disabled.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

**Test ID**
test-ep-4.2.1-f-023

**Category**
Resilience, Cache & Edge Cases

**Description**
Verify that closing the lead details page automatically triggers a refresh of the dashboard widget counts on return.

**Preconditions**
1. User logs follow-up or closes a lead, changing its follow-up status.

**Input / Steps**
1. Close Lead A.
2. Navigate back to dashboard.

**Expected Result**
1. Dashboard state refetches counts automatically on mount, displaying the correct incremented/decremented totals without manual page refreshes.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

## Final Review Metrics

1. **Total Number of Test Cases:** 23 test cases (`test-ep-4.2.1-f-001` through `test-ep-4.2.1-f-023`).
2. **Coverage Summary:** 100% functional test coverage for the story frontend requirements:
   - "My Follow-ups Today" widget sorting, counts, routing, and error loading states.
   - "Overdue Follow-ups" dashboard widget, calculations, and list order.
   - Lead List overdue red tags, conditional status removals (Won/Lost/New logs), and timezone boundaries.
   - Admin Escalation widget for 3+ days overdue leads, grouping, filtering, and role protection.
   - In-app notification badge counters, popups, dropdown items, read markers, batch actions, and real-time updates.
   - Complete Keyboard tab controls, WCAG AA color standards, and screen reader labels.
   - Cache consistency, race conditions, offline local-storage fallback, and optimistic update rollbacks.
3. **Traceability Summary:** Maps to requirements defined in STORY-4.2.1, C1-84, C1-85, C1-86, C1-87, AC1, AC2, and AC3.
