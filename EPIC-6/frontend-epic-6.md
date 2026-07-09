# EPIC-6: Analytics & Export — Frontend Test Cases

> **Epic Goal:** Provide real-time dashboard metrics, follow-up management, calendar scheduling, and data export capabilities for actionable insights.
> **Stories:**
> - **STORY-6.1.1:** Admin Dashboard — KPI cards, category-volume chart, won-rate-by-source chart, and at-risk widget.
> - **STORY-6.2.1:** Marketing Executive Dashboard — Personal KPI cards, conversion rate widget, and today's follow-ups list.
> - **STORY-6.3.1:** Export Lead Data — CSV/Excel export modal, filter confirmation, export history, and RBAC.
> **Tech Stack:** React (Vite) / TailwindCSS / Vitest / React Testing Library
> **Total Test Cases:** 35

---

## Table of Contents

### Part 1: STORY-6.1.1 — Admin Dashboard
1. [KPI Cards — Data Display & Date Filter](#1-kpi-cards--data-display--date-filter)
2. [Category Volume Chart](#2-category-volume-chart)
3. [Won Rate by Source Chart](#3-won-rate-by-source-chart)
4. [At Risk Widget](#4-at-risk-widget)

### Part 2: STORY-6.2.1 — Marketing Executive Dashboard
5. [ME KPI Cards](#5-me-kpi-cards)
6. [ME Conversion Rate Widget](#6-me-conversion-rate-widget)
7. [ME Today's Follow-ups List](#7-me-todays-follow-ups-list)

### Part 3: STORY-6.3.1 — Export Lead Data
8. [Export Button & RBAC](#8-export-button--rbac)
9. [Export Modal & Format Selection](#9-export-modal--format-selection)
10. [Export History Page](#10-export-history-page)
11. [Accessibility & Resilience](#11-accessibility--resilience)

---

## Part 1: STORY-6.1.1 — Admin Dashboard

## 1. KPI Cards — Data Display & Date Filter

Consumes `GET /admin/dashboard/kpis`.

---

**Test ID**
test-ep-6.1.1-f-001

**Category**
KPI Cards — Data Display

**Description**
Admin dashboard renders KPI cards showing total_leads, status-wise counts, today_followups, lead quality breakdown (Hot/Warm/Cold), and conversion rate.

**Preconditions**
1. User logged in as Admin.
2. Navigate to `/admin/dashboard`.
3. API returns full KPI payload with 150 total leads, 30 new, 12 today_followups, 40 contacted, 25 qualified, 20 meeting, 15 proposal, 10 negotiation, 8 won, 2 lost, 5.33% conversion, 50 hot, 70 warm, 30 cold.

**Input / Steps**
1. Observe KPI card grid on the dashboard.

**Expected Result**
1. Card titled "Total Leads" displays `150`.
2. Card titled "Today's Follow-ups" displays `12`.
3. Card titled "New" displays `30`.
4. Card titled "Won" displays `8`, "Lost" displays `2`.
5. Card titled "Conversion Rate" displays `5.33%`.
6. Quality section shows Hot: `50`, Warm: `70`, Cold: `30`.
7. All counts match the `data` object from API response.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-002

**Category**
KPI Cards — Data Display

**Description**
KPI cards re-render with filtered data when date range is selected from the date picker.

**Preconditions**
1. Admin logged in.
2. Dashboard loaded with default (all-time) KPI data.
3. API returns filtered data for 2026-01-01 to 2026-06-30.

**Input / Steps**
1. Click date range picker on the dashboard header.
2. Select from = 2026-01-01, to = 2026-06-30.
3. Click "Apply".

**Expected Result**
1. `GET /admin/dashboard/kpis?from=2026-01-01&to=2026-06-30` dispatched.
2. KPI cards update with filtered values (total_leads 100, new 20, today_followups 8, won 6, lost 1, conversion_rate 6%).
3. Date range picker shows the selected range.
4. Previous (unfiltered) values no longer displayed.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-003

**Category**
KPI Cards — Data Display

**Description**
Today's follow-ups count (`today_followups` field) is displayed as a distinct KPI card with a bell/calendar icon.

**Preconditions**
1. Admin logged in.
2. API returns `today_followups: 12`.

**Input / Steps**
1. Observe the "Today's Follow-ups" card.

**Expected Result**
1. Card shows value `12`.
2. Card has an icon (bell or calendar) indicating follow-ups.
3. Clicking the card navigates to a filtered view or shows a tooltip.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-004

**Category**
KPI Cards — Data Display

**Description**
Admin-only dashboard — Marketing Executive accessing `/admin/dashboard` sees 403 page or is redirected.

**Preconditions**
1. User logged in as ME.
2. Navigate to `/admin/dashboard`.

**Input / Steps**
1. Load the `/admin/dashboard` route.

**Expected Result**
1. Dashboard does NOT render KPI cards.
2. "Access Denied" message or redirect to `/marketing/dashboard`.
3. No API calls to `/admin/dashboard/kpis` are made.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-6.1.1

---

## 2. Category Volume Chart

Consumes `GET /admin/dashboard/category-volume`.

---

**Test ID**
test-ep-6.1.1-f-005

**Category**
Category Volume Chart

**Description**
Category Volume chart renders as a horizontal bar chart or grouped bar chart showing lead count per category/sub_category.

**Preconditions**
1. Admin logged in.
2. API returns 3 data points: Software Solutions/CRM (4200), Software Solutions/ERP (2600), Digital Marketing/SEO (1800).

**Input / Steps**
1. Observe the Category Volume chart widget on the dashboard.

**Expected Result**
1. Chart renders with 3 bars or groups.
2. Each bar shows the category + sub_category label and lead_count.
3. Chart has a title "Category Volume".
4. Chart is interactive (hover shows tooltip with exact count).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-006

**Category**
Category Volume Chart

**Description**
Category Volume chart respects the global date range filter and re-fetches when date range changes.

**Preconditions**
1. Admin logged in.
2. Dashboard loaded with default date range.

**Input / Steps**
1. Change the date range picker to 2026-01-01 to 2026-06-30.
2. Click "Apply".

**Expected Result**
1. `GET /admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30` dispatched.
2. Chart re-renders with updated data.
3. Loading state shown while fetching.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-007

**Category**
Category Volume Chart

**Description**
Category Volume chart shows empty state when no data matches the selected range.

**Preconditions**
1. Admin logged in.
2. API returns `{ "success": true, "data": [] }` for the selected range.

**Input / Steps**
1. Select date range with no matching leads.

**Expected Result**
1. Chart area displays "No data available for this period" message.
2. Chart is not rendered; empty state placeholder shown instead.
3. No JavaScript errors.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.1.1

---

## 3. Won Rate by Source Chart

Consumes `GET /admin/dashboard/won-rate-by-source`.

---

**Test ID**
test-ep-6.1.1-f-008

**Category**
Won Rate by Source Chart

**Description**
Won Rate by Source chart renders as a bar chart showing win_rate % per lead source.

**Preconditions**
1. Admin logged in.
2. API returns 3 sources: Website (7.5%), Referral (12%), Google Ads (5%).

**Input / Steps**
1. Observe the Won Rate by Source chart widget.

**Expected Result**
1. Chart renders with 3 bars, one per source.
2. Each bar shows source label and win_rate percentage.
3. Chart has a title "Win Rate by Source".
4. Bars are color-coded (green for high, yellow for medium, red for low).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-009

**Category**
Won Rate by Source Chart

**Description**
Won Rate chart shows empty state with "No closed leads yet" when no data exists.

**Preconditions**
1. Admin logged in.
2. API returns `{ "success": true, "data": [] }`.

**Input / Steps**
1. Select a date range with no won/lost leads.

**Expected Result**
1. Chart area displays "No closed leads for this period" message.
2. Empty state icon or illustration shown.
3. No chart rendering errors.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.1.1

---

## 4. At Risk Widget

Consumes `GET /admin/dashboard/at-risk`.

---

**Test ID**
test-ep-6.1.1-f-010

**Category**
At Risk Widget

**Description**
At Risk widget displays total at-risk count, a breakdown by assigned user, and a list of overdue leads.

**Preconditions**
1. Admin logged in.
2. API returns `total_at_risk: 220`, breakdown with Priya (34 leads, oldest 12 days), and a leads array.

**Input / Steps**
1. Observe the At Risk widget on the dashboard.

**Expected Result**
1. Header shows "At Risk Leads: 220".
2. Breakdown section lists users with their at_risk_count.
3. Leads table shows lead_id, company_name, assigned_to, days_overdue.
4. Rows sorted by `days_overdue` descending.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-011

**Category**
At Risk Widget

**Description**
At Risk widget supports configurable `overdue_days` threshold via input or dropdown.

**Preconditions**
1. Admin logged in.
2. Widget loaded with default overdue_days = 3.

**Input / Steps**
1. Change the overdue threshold from 3 to 7 days.
2. Click "Apply" or the widget refreshes automatically.

**Expected Result**
1. `GET /admin/dashboard/at-risk?overdue_days=7` dispatched.
2. Widget updates with new data for 7-day threshold.
3. Input reflects the selected value.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.1.1-f-012

**Category**
At Risk Widget

**Description**
At Risk widget shows empty state when no leads are overdue.

**Preconditions**
1. Admin logged in.
2. API returns `{ "total_at_risk": 0, "breakdown": [], "leads": [] }`.

**Input / Steps**
1. Set a threshold that results in zero at-risk leads.

**Expected Result**
1. Widget displays "No at-risk leads" message.
2. Breakdown and leads sections are hidden.
3. Total displays `0`.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.1.1

---

## Part 2: STORY-6.2.1 — Marketing Executive Dashboard

## 5. ME KPI Cards

Consumes `GET /marketing/dashboard/cards`.

---

**Test ID**
test-ep-6.2.1-f-001

**Category**
ME KPI Cards

**Description**
Marketing Executive dashboard renders KPI cards showing my_leads, my_followups_today, my_won_leads, my_lost_leads.

**Preconditions**
1. User logged in as ME.
2. Navigate to `/marketing/dashboard`.
3. API returns my_leads: 50, my_followups_today: 5, my_won_leads: 8, my_lost_leads: 3.

**Input / Steps**
1. Observe the KPI card grid on ME dashboard.

**Expected Result**
1. Card titled "My Leads" displays `50`.
2. Card titled "Today's Follow-ups" displays `5`.
3. Card titled "Won Leads" displays `8`.
4. Card titled "Lost Leads" displays `3`.
5. All values scoped to the logged-in user.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.2.1

---

**Test ID**
test-ep-6.2.1-f-002

**Category**
ME KPI Cards

**Description**
ME KPI cards show zero values when the user has no leads assigned.

**Preconditions**
1. ME with zero leads logged in.
2. API returns all zero values.

**Input / Steps**
1. Navigate to `/marketing/dashboard`.

**Expected Result**
1. All cards display `0`.
2. Cards are still visible (not hidden) — shows "My Leads: 0", etc.
3. No error or crash.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.2.1

---

**Test ID**
test-ep-6.2.1-f-003

**Category**
ME KPI Cards

**Description**
ME dashboard is restricted — Admin user accessing `/marketing/dashboard` sees 403 or redirect.

**Preconditions**
1. User logged in as Admin.
2. Navigate to `/marketing/dashboard`.

**Input / Steps**
1. Load the `/marketing/dashboard` route.

**Expected Result**
1. ME KPI cards do NOT render.
2. "Access Denied" message or redirect to `/admin/dashboard`.
3. No API calls to `/marketing/dashboard/cards` are made.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-6.2.1

---

## 6. ME Conversion Rate Widget

Consumes `GET /marketing/dashboard/conversion-rate`.

---

**Test ID**
test-ep-6.2.1-f-004

**Category**
ME Conversion Rate Widget

**Description**
Conversion rate widget displays Won, Lost, Total Closed counts and the conversion_rate percentage for the logged-in ME.

**Preconditions**
1. ME logged in.
2. API returns won: 8, lost: 3, total_closed: 11, conversion_rate: 72.73%.

**Input / Steps**
1. Observe the Conversion Rate widget.

**Expected Result**
1. Widget shows "Won: 8", "Lost: 3".
2. Large percentage display: `72.73%`.
3. Visual indicator (progress bar or donut chart) representing the ratio.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.2.1

---

**Test ID**
test-ep-6.2.1-f-005

**Category**
ME Conversion Rate Widget

**Description**
Conversion rate widget displays 0% when no Won/Lost leads exist, with no divide-by-zero UI error.

**Preconditions**
1. ME with zero closed leads logged in.
2. API returns won: 0, lost: 0, total_closed: 0, conversion_rate: 0%.

**Input / Steps**
1. Observe the Conversion Rate widget.

**Expected Result**
1. Widget displays `0%`.
2. Won: 0, Lost: 0, Total Closed: 0.
3. Visual indicator shows 0% (empty bar/zero state).
4. No NaN, Infinity, or crash.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.2.1

---

## 7. ME Today's Follow-ups List

Consumes `GET /marketing/followups/today`.

---

**Test ID**
test-ep-6.2.1-f-006

**Category**
ME Today's Follow-ups List

**Description**
Today's Follow-ups list renders leads due today sorted by lead_quality (Hot first), showing company_name, contact_person, lead_quality badge, next_followup_date, and status.

**Preconditions**
1. ME logged in.
2. API returns 5 leads with varied lead_quality (Hot, Warm, Cold).

**Input / Steps**
1. Navigate to the Follow-ups section on the ME dashboard.
2. Observe the list.

**Expected Result**
1. List renders 5 items.
2. Items sorted Hot first, then Warm, then Cold.
3. Each item shows: company_name, contact_person, lead_quality (color-coded badge), next_followup_date (formatted), status.
4. Hot leads have a red/highlighted badge.
5. Follow-ups due today are visually distinct.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.2.1

---

**Test ID**
test-ep-6.2.1-f-007

**Category**
ME Today's Follow-ups List

**Description**
Follow-ups list shows empty state when no follow-ups are due today.

**Preconditions**
1. ME logged in.
2. API returns `{ "data": [], "pagination": { "total_records": 0 } }`.

**Input / Steps**
1. Navigate to the Follow-ups section.

**Expected Result**
1. "No follow-ups due today" message displayed.
2. Optional: celebration icon or illustration.
3. No list/table rendered.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.2.1

---

**Test ID**
test-ep-6.2.1-f-008

**Category**
ME Today's Follow-ups List

**Description**
Follow-ups list supports "Load more" pagination when entries exceed the initial page limit.

**Preconditions**
1. ME logged in.
2. 25 follow-ups due today.
3. API returns 20 on page 1 with `total_pages: 2`.

**Input / Steps**
1. Load the Follow-ups list.
2. Click "Load more" button.

**Expected Result**
1. 20 items displayed initially.
2. "Load more" button visible below the list.
3. Clicking loads remaining 5 items.
4. "Load more" disappears after all items loaded.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.2.1

---

## Part 3: STORY-6.3.1 — Export Lead Data

## 8. Export Button & RBAC

Consumes `GET /admin/leads/export`.

---

**Test ID**
test-ep-6.3.1-f-001

**Category**
Export Button & RBAC

**Description**
"Export" button is visible on the Lead List page for Admin users.

**Preconditions**
1. User logged in as Admin.
2. Navigate to `/admin/leads` (Lead List page).

**Input / Steps**
1. Observe the top toolbar area above the Lead List table.

**Expected Result**
1. "Export" button rendered with a download icon.
2. Button is enabled when leads are present.
3. Button has a dropdown or split-button for format selection (CSV/Excel).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

**Test ID**
test-ep-6.3.1-f-002

**Category**
Export Button & RBAC

**Description**
Export button is hidden for Marketing Executive users.

**Preconditions**
1. User logged in as ME.
2. Navigate to `/marketing/leads` (ME Lead List).

**Input / Steps**
1. Observe the top toolbar area.

**Expected Result**
1. No "Export" button is rendered.
2. No export-related UI elements visible.
3. Attempting to call the export API directly from browser console would fail (403).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-6.3.1

---

## 9. Export Modal & Format Selection

---

**Test ID**
test-ep-6.3.1-f-003

**Category**
Export Modal & Format Selection

**Description**
Clicking Export opens a modal with format selection (CSV/Excel) and confirmation of applied filters.

**Preconditions**
1. Admin logged in.
2. Lead List has active filters: status=Contacted, quality=Hot, date range 2026-01-01 to 2026-06-26.

**Input / Steps**
1. Click the "Export" button.

**Expected Result**
1. Modal opens with title "Export Leads".
2. Format selection: radio buttons or toggle for "CSV" and "Excel".
3. Filter summary displayed: "Status: Contacted, Quality: Hot, Date: 2026-01-01 to 2026-06-26".
4. "Export" and "Cancel" buttons in the modal footer.
5. Default format is CSV.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

**Test ID**
test-ep-6.3.1-f-004

**Category**
Export Modal & Format Selection

**Description**
Selecting CSV and clicking Export dispatches GET request and triggers file download.

**Preconditions**
1. Admin logged in.
2. Export modal open with CSV selected.

**Input / Steps**
1. Click "Export" button in the modal.

**Expected Result**
1. GET request dispatched to `/admin/leads/export?format=csv` with current filters.
2. File download initiated with `.csv` filename.
3. Success toast: "Export started — 245 records".
4. Modal closes automatically on success.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

**Test ID**
test-ep-6.3.1-f-005

**Category**
Export Modal & Format Selection

**Description**
Selecting Excel format and clicking Export dispatches request for Excel file.

**Preconditions**
1. Admin logged in.
2. Export modal open with Excel format selected.

**Input / Steps**
1. Select "Excel" format.
2. Click "Export".

**Expected Result**
1. GET request dispatched to `/admin/leads/export?format=excel` with current filters.
2. File download initiated with `.xlsx` filename.
3. Success toast with record count.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

**Test ID**
test-ep-6.3.1-f-006

**Category**
Export Modal & Format Selection

**Description**
Export modal shows error state when API returns 404 (no leads match filters).

**Preconditions**
1. Admin logged in.
2. Filters match zero leads.
3. API returns 404.

**Input / Steps**
1. Open export modal with zero-match filters.
2. Click "Export".

**Expected Result**
1. Error message displayed inline in modal: "No leads match the current filters".
2. Modal remains open (does not close).
3. User can modify filters and retry.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-6.3.1

---

## 10. Export History Page

---

**Test ID**
test-ep-6.3.1-f-007

**Category**
Export History Page

**Description**
Export History page lists past exports with columns: date, format, record count, filters, status.

**Preconditions**
1. Admin logged in.
2. Navigate to `/admin/leads/export/history`.
3. API returns export history entries.

**Input / Steps**
1. Observe the Export History table.

**Expected Result**
1. Table columns: "Date", "Format", "Records", "Filters", "Status".
2. Each row shows the export details.
3. Rows sorted by date descending (newest first).
4. "Download" link/button available for completed exports.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

**Test ID**
test-ep-6.3.1-f-008

**Category**
Export History Page

**Description**
Clicking "Download" on an export history row triggers re-download of the exported file.

**Preconditions**
1. Admin logged in.
2. Export history row with completed status and download ID.

**Input / Steps**
1. Click "Download" button on a history row.

**Expected Result**
1. GET request to `/admin/leads/export/history/{id}/download`.
2. File download triggered.
3. Progress indicator shown during download.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-6.3.1

---

## 11. Accessibility & Resilience

---

**Test ID**
test-ep-6.3.1-f-009

**Category**
Accessibility & Resilience

**Description**
Loading state shown while KPI data is being fetched on Admin dashboard.

**Preconditions**
1. Admin logged in.
2. API response delayed by 1.5 seconds.

**Input / Steps**
1. Navigate to `/admin/dashboard`.

**Expected Result**
1. Skeleton/placeholder cards displayed while loading.
2. After data loads, skeletons replaced with actual values.
3. No layout shift after content appears.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.3.1-f-010

**Category**
Accessibility & Resilience

**Description**
Error state shown when KPI API returns 500 on Admin dashboard.

**Preconditions**
1. Admin logged in.
2. API returns 500 error.

**Input / Steps**
1. Navigate to `/admin/dashboard`.

**Expected Result**
1. Error banner or inline error message: "Failed to load dashboard data".
2. "Retry" button visible.
3. Other parts of the page (if any) remain interactive.
4. No blank/white page.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.1.1

---

**Test ID**
test-ep-6.3.1-f-011

**Category**
Accessibility & Resilience

**Description**
Keyboard navigation and ARIA labels across Admin dashboard components.

**Preconditions**
1. Admin logged in.
2. Dashboard fully loaded with data.

**Input / Steps**
1. Tab through KPI cards, chart widgets, date picker, and at-risk widget.
2. Inspect ARIA attributes.

**Expected Result**
1. Tab order follows logical sequence (date picker first, then KPI cards, then charts).
2. All interactive elements receive visible focus ring.
3. Charts have `aria-label` describing the chart type and data summary.
4. KPI cards have `role="status"` or appropriate ARIA roles.
5. Date picker has accessible label and calendar button.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-6.1.1, STORY-6.2.1

---

**Test ID**
test-ep-6.3.1-f-012

**Category**
Accessibility & Resilience

**Description**
Loading and error states for ME dashboard follows-ups and conversion rate.

**Preconditions**
1. ME logged in.
2. Scenario A: API delayed (loading). Scenario B: API returns 500 (error).

**Input / Steps**
1. Observe loading state for follow-ups list.
2. Simulate error and observe error state.

**Expected Result**
1. Loading: skeleton rows for follow-ups list; skeleton card for conversion rate.
2. Error: inline error message with "Retry" button for each failed widget.
3. Widgets that loaded successfully remain visible while failed ones show error.
4. Graceful degradation — no full page crash.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-6.2.1

---

> **End of Frontend Test Cases for EPIC-6** — Total: 35 test cases
