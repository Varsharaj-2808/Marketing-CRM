



Search pentaxial Technologies



PT

Home
1

DMs
2

Activity
3

Files
4

Later
5

More
0

pentaxial Technologies


Find a conversation…







Messages

CanvasListFolder
Loading history…
vishnu
  2:11 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 35

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is …
vishnu
  2:38 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
**test-ep…




vishnu
  4:51 PM
frontend-story-2.4.1.md
 

frontend-story-2.4.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.4.1: Lead Stage Management)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to update a lead’s stage so that pipeline progress is accurately reflected. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 41

📋 Table of Contents
Stage Selector — UI & Interaction
Stage Transition — Validation & Flow
Lost Reason — Mandatory Capture
Won Closure — Deal Value & Closure Date Capture
Lead History — Timeline Display
Won/Lost Lock — Closed Lead Handling & Admin Reopen
1. Stage Selector — UI & Interaction
Purpose: The Lead Detail page displays a stage selector showing only valid next stages based on the current stage.

test-ep-2.4.1-001 (Positive):

Description: Stage selector renders correct options for New Lead stage
Input: Navigate to /app/leads/{id} as ME. Lead stage is "New Lead". Mock API returns lead data.
Expected Output: Stage selector dropdown shows the current stage "New Lead" as selected/displayed. Clicking the dropdown reveals available options: Contacted, Hold, Lost. Options Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Won are NOT listed. The selector is enabled (interactive).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-002 (Positive):

Description: Stage selector options update dynamically as stage progresses
Input: Navigate to lead at "Contacted" stage. Open stage selector.
Expected Output: Available options: Meeting Scheduled, Hold, Lost. Options for earlier stages (New Lead) are NOT listed. Won is NOT listed (must use close flow from Negotiation).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-003 (Positive):

Description: Stage selector at Negotiation shows Lost and Won options (via close flow)
Input: Navigate to lead at "Negotiation" stage.
Expected Output: Stage selector shows Lost as a direct option (triggers Lost Reason modal). A separate “Close as Won” button or menu item triggers Won Closure modal. Or both Lost and Won are available as stage options with respective modals.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-004 (Positive):

Description: Stage selector is disabled for closed leads (Won/Lost) for ME
Input: Navigate to lead at "Won" stage as ME.
Expected Output: Stage selector is disabled (greyed out, non-interactive). A lock icon or closed badge is displayed. Text: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-005 (Positive):

Description: Admin sees enabled stage selector even on closed leads
Input: Navigate to /admin/leads/{id} for a Won lead as Admin.
Expected Output: Stage selector is enabled for Admin. A “Reopen Lead” button is visible (not the standard stage dropdown). Admin can proceed with reopen flow.
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-006 (Positive):

Description: Loading skeleton shown while lead data loads
Input: Navigate to lead detail page. API response delayed by 500ms.
Expected Output: Stage selector area shows a skeleton or placeholder during loading. After API resolves, selector renders with correct options.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-007 (Negative):

Description: API error fetching lead data shows error state
Input: Navigate to lead detail page. Mock API returns 500.
Expected Output: Error state: “Failed to load lead data. [Retry]”. Stage selector is not rendered.
Traceability: STORY-2.4.1, C1-54
2. Stage Transition — Validation & Flow
Purpose: Selecting a valid stage triggers the PUT /marketing/leads/:id/status API. Invalid/skipped transitions show inline errors.

test-ep-2.4.1-008 (Positive):

Description: Selecting a valid stage triggers API call and updates UI
Input: ME selects "Contacted" from stage selector (lead at "New Lead"). Confirmation prompt or direct transition occurs. Mock PUT /marketing/leads/{id}/status returns 200.
Expected Output: Success toast: “Stage updated to Contacted”. Stage selector now shows "Contacted" as current stage. Available options update to reflect next valid stages from Contacted.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-009 (Positive):

Description: Progressing through full pipeline updates UI at each step
Input: ME transitions lead through: New Lead → Contacted → Meeting Scheduled → Requirement Gathering → Proposal Sent → Negotiation. Each step via stage selector.
Expected Output: Each transition succeeds with toast. Current stage updates. Options update dynamically per stage.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-010 (Negative):

Description: Selecting a skipped/illegal stage shows inline error
Input: ME at "New Lead" attempts to select "Meeting Scheduled" (not in allowed list for New Lead). The option is not available in the dropdown.
Expected Output: The invalid option is not rendered in the dropdown. ME cannot select it. No API call is made for non-existent options.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-011 (Negative):

Description: API 422 for illegal transition shows error toast
Input: ME bypasses frontend restrictions (e.g., via API console) and attempts illegal transition. Mock API returns 422.
Expected Output: Error toast: “Invalid stage transition. Allowed transitions from [current stage]: [list]”. Stage selector reverts to previous valid stage.
Traceability: STORY-2.4.1, C1-55
test-ep-2.4.1-012 (Negative):

Description: API network error during stage transition
Input: ME selects valid stage. Mock API returns 500.
Expected Output: Error toast: “Failed to update stage. Please try again.” Stage selector stays at current stage. User can retry.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-013 (Edge):

Description: Select same stage (no-op) — no API call or toast
Input: ME clicks the currently selected stage "Contacted" again.
Expected Output: No API call is made. No toast. Stage selector remains unchanged.
Traceability: STORY-2.4.1, C1-54, C1-55
3. Lost Reason — Mandatory Capture
Purpose: When Stage = Lost is selected, a modal forces the user to pick a Lost Reason from a predefined enum before saving.

test-ep-2.4.1-014 (Positive):

Description: Lost Reason modal opens when Lost is selected
Input: ME selects "Lost" from stage selector (lead at any active stage).
Expected Output: A modal dialog opens with title “Close as Lost”. A required dropdown labeled “Lost Reason” is present with options: Budget, Competitor, Not Interested, No Response, Timing, Other. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-015 (Positive):

Description: Submit Lost with valid reason closes modal and updates lead
Input: ME selects "Budget" from Lost Reason dropdown, clicks “Confirm”. Mock POST /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Lost”. Stage selector now shows "Lost" as disabled (closed). Lead status shows “Lost” with the reason displayed.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-016 (Negative):

Description: Submit Lost without selecting a reason
Input: ME opens Lost modal, clicks “Confirm” without selecting a reason.
Expected Output: Inline validation: “Please select a lost reason.” Dropdown border turns red. No API call made. Modal remains open.
Traceability: STORY-2.4.1, C1-56
test-ep-2.4.1-017 (Negative):

Description: API error during Lost close
Input: ME selects reason, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open. User can retry or cancel.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-018 (Edge):

Description: Cancel Lost modal
Input: ME opens Lost modal, clicks “Cancel” or presses Escape.
Expected Output: Modal closes. Stage selector reverts to previous stage. No API call made. Lead unchanged.
Traceability: STORY-2.4.1, C1-54, C1-56
4. Won Closure — Deal Value & Closure Date Capture
Purpose: When Stage = Won is selected, a modal forces entry of Final Deal Value and Closure Date before saving.

test-ep-2.4.1-019 (Positive):

Description: Won Closure modal opens when Won is triggered
Input: ME clicks “Close as Won” button/option (lead at "Negotiation").
Expected Output: A modal dialog opens with title “Close as Won”. Input fields: “Final Deal Value” (numeric input) and “Closure Date” (date picker). Both fields are marked as required. “Confirm” and “Cancel” buttons present.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-020 (Positive):

Description: Submit Won with valid values closes modal and updates lead
Input: ME enters 50000 in deal value, selects 2026-07-15 as closure date, clicks “Confirm”. Mock PUT /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Won with deal value of $50,000”. Stage selector shows "Won" as disabled. Lead detail shows Won badge, deal value, and closure date.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-021 (Positive):

Description: Submit Won with zero deal value (free service)
Input: ME enters 0 as deal value, valid closure date, clicks “Confirm”.
Expected Output: HTTP 200 OK. Success toast shown.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-022 (Negative):

Description: Submit Won without deal value
Input: ME leaves deal value empty, enters valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Final deal value is required.” Input border turns red. No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-023 (Negative):

Description: Submit Won without closure date
Input: ME enters valid deal value, leaves closure date empty, clicks “Confirm”.
Expected Output: Inline validation: “Closure date is required.” No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-024 (Negative):

Description: Submit Won with negative deal value
Input: ME enters -1000 as deal value, valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Deal value cannot be negative.” Input border turns red.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-025 (Negative):

Description: API error during Won close
Input: ME enters valid values, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-026 (Edge):

Description: Cancel Won modal
Input: ME opens Won modal, enters values, clicks “Cancel”.
Expected Output: Modal closes. Stage selector reverts. No API call made.
Traceability: STORY-2.4.1, C1-54, C1-57
5. Lead History — Timeline Display
Purpose: The Lead Detail page displays a chronological timeline of all stage changes. Entries are read-only and immutable.

test-ep-2.4.1-027 (Positive):

Description: Timeline displays stage change events in chronological order
Input: Lead has history: New Lead → Contacted → Meeting Scheduled → Proposal Sent. Navigate to Lead Detail and scroll to Timeline section.
Expected Output: Timeline shows 3 stage change entries sorted newest first. Each entry displays: event type icon (stage change), Previous Stage → New Stage, Actor name, Timestamp (relative or absolute). The most recent transition is highlighted.
Traceability: STORY-2.4.1, C1-54, C1-58
test-ep-2.4.1-028 (Positive):

Description: Timeline includes close and reopen events with details
Input: Lead has transitioned: Contacted → Lost (Budget) → Reopened → Contacted → Won ($50k). …



vishnu has paused their notifications


Message vishnu







Shift + Enter to add a new line




EPIC-2: Lead Management — Frontend Test Cases (STORY-2.4.1: Lead Stage Management)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to update a lead’s stage so that pipeline progress is accurately reflected. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 41

📋 Table of Contents
Stage Selector — UI & Interaction
Stage Transition — Validation & Flow
Lost Reason — Mandatory Capture
Won Closure — Deal Value & Closure Date Capture
Lead History — Timeline Display
Won/Lost Lock — Closed Lead Handling & Admin Reopen
1. Stage Selector — UI & Interaction
Purpose: The Lead Detail page displays a stage selector showing only valid next stages based on the current stage.

test-ep-2.4.1-001 (Positive):

Description: Stage selector renders correct options for New Lead stage
Input: Navigate to /app/leads/{id} as ME. Lead stage is "New Lead". Mock API returns lead data.
Expected Output: Stage selector dropdown shows the current stage "New Lead" as selected/displayed. Clicking the dropdown reveals available options: Contacted, Hold, Lost. Options Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Won are NOT listed. The selector is enabled (interactive).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-002 (Positive):

Description: Stage selector options update dynamically as stage progresses
Input: Navigate to lead at "Contacted" stage. Open stage selector.
Expected Output: Available options: Meeting Scheduled, Hold, Lost. Options for earlier stages (New Lead) are NOT listed. Won is NOT listed (must use close flow from Negotiation).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-003 (Positive):

Description: Stage selector at Negotiation shows Lost and Won options (via close flow)
Input: Navigate to lead at "Negotiation" stage.
Expected Output: Stage selector shows Lost as a direct option (triggers Lost Reason modal). A separate “Close as Won” button or menu item triggers Won Closure modal. Or both Lost and Won are available as stage options with respective modals.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-004 (Positive):

Description: Stage selector is disabled for closed leads (Won/Lost) for ME
Input: Navigate to lead at "Won" stage as ME.
Expected Output: Stage selector is disabled (greyed out, non-interactive). A lock icon or closed badge is displayed. Text: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-005 (Positive):

Description: Admin sees enabled stage selector even on closed leads
Input: Navigate to /admin/leads/{id} for a Won lead as Admin.
Expected Output: Stage selector is enabled for Admin. A “Reopen Lead” button is visible (not the standard stage dropdown). Admin can proceed with reopen flow.
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-006 (Positive):

Description: Loading skeleton shown while lead data loads
Input: Navigate to lead detail page. API response delayed by 500ms.
Expected Output: Stage selector area shows a skeleton or placeholder during loading. After API resolves, selector renders with correct options.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-007 (Negative):

Description: API error fetching lead data shows error state
Input: Navigate to lead detail page. Mock API returns 500.
Expected Output: Error state: “Failed to load lead data. [Retry]”. Stage selector is not rendered.
Traceability: STORY-2.4.1, C1-54
2. Stage Transition — Validation & Flow
Purpose: Selecting a valid stage triggers the PUT /marketing/leads/:id/status API. Invalid/skipped transitions show inline errors.

test-ep-2.4.1-008 (Positive):

Description: Selecting a valid stage triggers API call and updates UI
Input: ME selects "Contacted" from stage selector (lead at "New Lead"). Confirmation prompt or direct transition occurs. Mock PUT /marketing/leads/{id}/status returns 200.
Expected Output: Success toast: “Stage updated to Contacted”. Stage selector now shows "Contacted" as current stage. Available options update to reflect next valid stages from Contacted.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-009 (Positive):

Description: Progressing through full pipeline updates UI at each step
Input: ME transitions lead through: New Lead → Contacted → Meeting Scheduled → Requirement Gathering → Proposal Sent → Negotiation. Each step via stage selector.
Expected Output: Each transition succeeds with toast. Current stage updates. Options update dynamically per stage.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-010 (Negative):

Description: Selecting a skipped/illegal stage shows inline error
Input: ME at "New Lead" attempts to select "Meeting Scheduled" (not in allowed list for New Lead). The option is not available in the dropdown.
Expected Output: The invalid option is not rendered in the dropdown. ME cannot select it. No API call is made for non-existent options.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-011 (Negative):

Description: API 422 for illegal transition shows error toast
Input: ME bypasses frontend restrictions (e.g., via API console) and attempts illegal transition. Mock API returns 422.
Expected Output: Error toast: “Invalid stage transition. Allowed transitions from [current stage]: [list]”. Stage selector reverts to previous valid stage.
Traceability: STORY-2.4.1, C1-55
test-ep-2.4.1-012 (Negative):

Description: API network error during stage transition
Input: ME selects valid stage. Mock API returns 500.
Expected Output: Error toast: “Failed to update stage. Please try again.” Stage selector stays at current stage. User can retry.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-013 (Edge):

Description: Select same stage (no-op) — no API call or toast
Input: ME clicks the currently selected stage "Contacted" again.
Expected Output: No API call is made. No toast. Stage selector remains unchanged.
Traceability: STORY-2.4.1, C1-54, C1-55
3. Lost Reason — Mandatory Capture
Purpose: When Stage = Lost is selected, a modal forces the user to pick a Lost Reason from a predefined enum before saving.

test-ep-2.4.1-014 (Positive):

Description: Lost Reason modal opens when Lost is selected
Input: ME selects "Lost" from stage selector (lead at any active stage).
Expected Output: A modal dialog opens with title “Close as Lost”. A required dropdown labeled “Lost Reason” is present with options: Budget, Competitor, Not Interested, No Response, Timing, Other. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-015 (Positive):

Description: Submit Lost with valid reason closes modal and updates lead
Input: ME selects "Budget" from Lost Reason dropdown, clicks “Confirm”. Mock POST /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Lost”. Stage selector now shows "Lost" as disabled (closed). Lead status shows “Lost” with the reason displayed.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-016 (Negative):

Description: Submit Lost without selecting a reason
Input: ME opens Lost modal, clicks “Confirm” without selecting a reason.
Expected Output: Inline validation: “Please select a lost reason.” Dropdown border turns red. No API call made. Modal remains open.
Traceability: STORY-2.4.1, C1-56
test-ep-2.4.1-017 (Negative):

Description: API error during Lost close
Input: ME selects reason, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open. User can retry or cancel.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-018 (Edge):

Description: Cancel Lost modal
Input: ME opens Lost modal, clicks “Cancel” or presses Escape.
Expected Output: Modal closes. Stage selector reverts to previous stage. No API call made. Lead unchanged.
Traceability: STORY-2.4.1, C1-54, C1-56
4. Won Closure — Deal Value & Closure Date Capture
Purpose: When Stage = Won is selected, a modal forces entry of Final Deal Value and Closure Date before saving.

test-ep-2.4.1-019 (Positive):

Description: Won Closure modal opens when Won is triggered
Input: ME clicks “Close as Won” button/option (lead at "Negotiation").
Expected Output: A modal dialog opens with title “Close as Won”. Input fields: “Final Deal Value” (numeric input) and “Closure Date” (date picker). Both fields are marked as required. “Confirm” and “Cancel” buttons present.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-020 (Positive):

Description: Submit Won with valid values closes modal and updates lead
Input: ME enters 50000 in deal value, selects 2026-07-15 as closure date, clicks “Confirm”. Mock PUT /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Won with deal value of $50,000”. Stage selector shows "Won" as disabled. Lead detail shows Won badge, deal value, and closure date.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-021 (Positive):

Description: Submit Won with zero deal value (free service)
Input: ME enters 0 as deal value, valid closure date, clicks “Confirm”.
Expected Output: HTTP 200 OK. Success toast shown.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-022 (Negative):

Description: Submit Won without deal value
Input: ME leaves deal value empty, enters valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Final deal value is required.” Input border turns red. No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-023 (Negative):

Description: Submit Won without closure date
Input: ME enters valid deal value, leaves closure date empty, clicks “Confirm”.
Expected Output: Inline validation: “Closure date is required.” No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-024 (Negative):

Description: Submit Won with negative deal value
Input: ME enters -1000 as deal value, valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Deal value cannot be negative.” Input border turns red.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-025 (Negative):

Description: API error during Won close
Input: ME enters valid values, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-026 (Edge):

Description: Cancel Won modal
Input: ME opens Won modal, enters values, clicks “Cancel”.
Expected Output: Modal closes. Stage selector reverts. No API call made.
Traceability: STORY-2.4.1, C1-54, C1-57
5. Lead History — Timeline Display
Purpose: The Lead Detail page displays a chronological timeline of all stage changes. Entries are read-only and immutable.

test-ep-2.4.1-027 (Positive):

Description: Timeline displays stage change events in chronological order
Input: Lead has history: New Lead → Contacted → Meeting Scheduled → Proposal Sent. Navigate to Lead Detail and scroll to Timeline section.
Expected Output: Timeline shows 3 stage change entries sorted newest first. Each entry displays: event type icon (stage change), Previous Stage → New Stage, Actor name, Timestamp (relative or absolute). The most recent transition is highlighted.
Traceability: STORY-2.4.1, C1-54, C1-58
test-ep-2.4.1-028 (Positive):

Description: Timeline includes close and reopen events with details
Input: Lead has transitioned: Contacted → Lost (Budget) → Reopened → Contacted → Won ($50k).
Expected Output: Timeline shows all 4 events. Lost entry includes lost_reason = "Budget". Reopen entry includes reason and actor (Admin). Won entry includes final_deal_value and closure_date.
Traceability: STORY-2.4.1, C1-58, C1-59
test-ep-2.4.1-029 (Positive):

Description: Timeline entries have distinct icons per event type
Input: Lead has stage change, Lost, Reopen, and Won events.
Expected Output: Stage Change events show a right-arrow or forward icon. Lost events show a red/cross icon. Won events show a green/checkmark or trophy icon. Reopen events show a refresh/undo icon.
Traceability: STORY-2.4.1, C1-58
test-ep-2.4.1-030 (Positive):

Description: “Load more” button loads older history entries
Input: Lead has 25+ history entries. Timeline loads first 20. Click “Load more”.
Expected Output: First 20 entries displayed. Clicking “Load more” fetches next batch (remaining 5). Button disappears once all entries are loaded.
Traceability: STORY-2.4.1, C1-58
test-ep-2.4.1-031 (Negative):

Description: No edit or delete controls on any timeline entry
Input: ME or Admin views timeline entries.
Expected Output: No edit (pencil), delete (trash), or any modification icon is present on any history entry. Entries are display-only. Tooltip or text confirms “History entries are immutable.”
Traceability: STORY-2.4.1, C1-58
test-ep-2.4.1-032 (Edge):

Description: Empty timeline for newly created lead
Input: Lead has just been created with no stage changes yet. Navigate to Timeline section.
Expected Output: Empty state message: “No stage changes yet. Update the lead stage to start tracking history.”
Traceability: STORY-2.4.1, C1-54, C1-58
test-ep-2.4.1-039 (Negative):

Description: Lead History API returns 500 error
Input: Navigate to Lead Detail page. Mock GET /marketing/leads/{id}/lead-history returns 500 error after lead data loads.
Expected Output: Timeline section shows error state: “Failed to load lead history. [Retry]”. Clicking “Retry” re-triggers the history API call. The rest of the Lead Detail page (stage selector, lead info) remains visible and functional.
Traceability: STORY-2.4.1, C1-58
test-ep-2.4.1-040 (Positive):

Description: Timeline shows loading skeleton while history API is fetching
Input: Navigate to Lead Detail page. Mock GET /marketing/leads/{id}/lead-history response is delayed by 500ms.
Expected Output: Timeline section displays a loading skeleton or spinner while the API is in flight. After API resolves, skeletons are replaced with actual history entries. Skeleton height matches expected entry height to minimize layout shift.
Traceability: STORY-2.4.1, C1-58
test-ep-2.4.1-041 (Positive):

Description: “Load more” pagination fetches additional history entries
Input: Lead has 25 history entries. API returns first 20 entries with metadata: {"page":1,"totalPages":2,"totalEntries":25,"hasMore":true}. Click “Load more” button.
Expected Output: First load shows 20 entries with a “Load more (5 remaining)” button at the bottom. Clicking “Load more” triggers API call with ?page=2&limit=20. Button shows spinner during load. After load, remaining 5 entries are appended. Button disappears. No duplicate entries. Scroll position is preserved.
Traceability: STORY-2.4.1, C1-58
6. Won/Lost Lock — Closed Lead Handling & Admin Reopen
Purpose: Closed leads (Won/Lost) are locked for Marketing Executives. Admin can override with a mandatory reopen reason.

test-ep-2.4.1-033 (Positive):

Description: Admin clicks “Reopen Lead” button and reopen modal appears
Input: Navigate to /admin/leads/{id} for a Won lead as Admin. Click the “Reopen Lead” button.
Expected Output: A modal dialog opens with title “Reopen Lead”. Modal displays current closed stage (e.g., “This lead is currently Won”) and a text area or input for “Reopen Reason”. “Confirm Reopen” and “Cancel” buttons are present.
Traceability: STORY-2.4.1, C1-59
test-ep-2.4.1-034 (Positive):

Description: Reopen modal contains mandatory “Reopen Reason” text area
Input: Admin opens the Reopen modal on a Won lead.
Expected Output: A required text area labeled “Reopen Reason” is visible with a placeholder: “Explain why this lead is being reopened”. A hint text displays: “Provide a reason for reopening this lead.” Text area has a character counter or max length indicator (e.g., 500 chars). “Confirm Reopen” button is present but initially disabled or becomes enabled only when text is entered.
Traceability: STORY-2.4.1, C1-59
test-ep-2.4.1-035 (Negative):

Description: Admin attempts to reopen without entering a reason
Input: Admin opens Reopen modal, leaves reason field blank, clicks “Confirm Reopen”.
Expected Output: Inline validation error below text area: “Reopen reason is required.” Text area border turns red. No API call is made to POST /admin/leads/{id}/reopen. Modal stays open.
Traceability: STORY-2.4.1, C1-59
test-ep-2.4.1-036 (Positive):

Description: Successful reopen with valid reason updates UI and unlocks stage selector
Input: Admin enters “Client requested re-engagement” as reason, clicks “Confirm Reopen”. Mock POST /admin/leads/{id}/reopen returns 200 with updated lead (stage = “Contacted”).
Expected Output: Modal closes. Success toast: “Lead reopened successfully. Stage set to Contacted.” Stage selector now shows “Contacted” as current stage and is enabled. The closed/lock badge is removed. Lead status updates to active. Timeline shows a new “Lead Reopened” entry with the reason and Admin actor name.
Traceability: STORY-2.4.1, C1-59, C1-58
test-ep-2.4.1-037 (Negative):

Description: API failure during reopen flow shows error and does not unlock lead
Input: Admin enters valid reason, clicks “Confirm Reopen”. Mock POST /admin/leads/{id}/reopen returns 500 or network error.
Expected Output: Error toast: “Failed to reopen lead. Please try again.” Modal remains open with the entered reason preserved. Lead stage remains closed (Won/Lost). Stage selector remains disabled for both Admin and ME on re-fetch. User can retry or cancel.
Traceability: STORY-2.4.1, C1-59
test-ep-2.4.1-038 (Negative):

Description: ME still sees locked state after Admin’s reopen API failure
Input: Admin attempts to reopen but API returns 500. Then log in as the assigned ME and navigate to the same lead’s detail page.
Expected Output: ME sees the lead still in closed state (Won or Lost). Stage selector is disabled. “This lead is closed. Contact Admin to reopen.” message is displayed. The failed reopen attempt did not partially unlock the lead.
Traceability: STORY-2.4.1, C1-59
End of Frontend Test Cases for STORY-2.4.1 — Total: 41 test cases (Sections 1–6)





Search pentaxial Technologies



PT

Home
1

DMs
2

Activity
3

Files
4

Later
5

More
0

pentaxial Technologies


Find a conversation…







Messages

CanvasListFolder
Loading history…
vishnu
  2:11 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 35

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is …
vishnu
  2:38 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
**test-ep…




vishnu
  4:51 PM
frontend-story-2.4.1.md
 

frontend-story-2.4.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.4.1: Lead Stage Management)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to update a lead’s stage so that pipeline progress is accurately reflected. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 41

📋 Table of Contents
Stage Selector — UI & Interaction
Stage Transition — Validation & Flow
Lost Reason — Mandatory Capture
Won Closure — Deal Value & Closure Date Capture
Lead History — Timeline Display
Won/Lost Lock — Closed Lead Handling & Admin Reopen
1. Stage Selector — UI & Interaction
Purpose: The Lead Detail page displays a stage selector showing only valid next stages based on the current stage.

test-ep-2.4.1-001 (Positive):

Description: Stage selector renders correct options for New Lead stage
Input: Navigate to /app/leads/{id} as ME. Lead stage is "New Lead". Mock API returns lead data.
Expected Output: Stage selector dropdown shows the current stage "New Lead" as selected/displayed. Clicking the dropdown reveals available options: Contacted, Hold, Lost. Options Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Won are NOT listed. The selector is enabled (interactive).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-002 (Positive):

Description: Stage selector options update dynamically as stage progresses
Input: Navigate to lead at "Contacted" stage. Open stage selector.
Expected Output: Available options: Meeting Scheduled, Hold, Lost. Options for earlier stages (New Lead) are NOT listed. Won is NOT listed (must use close flow from Negotiation).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-003 (Positive):

Description: Stage selector at Negotiation shows Lost and Won options (via close flow)
Input: Navigate to lead at "Negotiation" stage.
Expected Output: Stage selector shows Lost as a direct option (triggers Lost Reason modal). A separate “Close as Won” button or menu item triggers Won Closure modal. Or both Lost and Won are available as stage options with respective modals.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-004 (Positive):

Description: Stage selector is disabled for closed leads (Won/Lost) for ME
Input: Navigate to lead at "Won" stage as ME.
Expected Output: Stage selector is disabled (greyed out, non-interactive). A lock icon or closed badge is displayed. Text: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-005 (Positive):

Description: Admin sees enabled stage selector even on closed leads
Input: Navigate to /admin/leads/{id} for a Won lead as Admin.
Expected Output: Stage selector is enabled for Admin. A “Reopen Lead” button is visible (not the standard stage dropdown). Admin can proceed with reopen flow.
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-006 (Positive):

Description: Loading skeleton shown while lead data loads
Input: Navigate to lead detail page. API response delayed by 500ms.
Expected Output: Stage selector area shows a skeleton or placeholder during loading. After API resolves, selector renders with correct options.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-007 (Negative):

Description: API error fetching lead data shows error state
Input: Navigate to lead detail page. Mock API returns 500.
Expected Output: Error state: “Failed to load lead data. [Retry]”. Stage selector is not rendered.
Traceability: STORY-2.4.1, C1-54
2. Stage Transition — Validation & Flow
Purpose: Selecting a valid stage triggers the PUT /marketing/leads/:id/status API. Invalid/skipped transitions show inline errors.

test-ep-2.4.1-008 (Positive):

Description: Selecting a valid stage triggers API call and updates UI
Input: ME selects "Contacted" from stage selector (lead at "New Lead"). Confirmation prompt or direct transition occurs. Mock PUT /marketing/leads/{id}/status returns 200.
Expected Output: Success toast: “Stage updated to Contacted”. Stage selector now shows "Contacted" as current stage. Available options update to reflect next valid stages from Contacted.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-009 (Positive):

Description: Progressing through full pipeline updates UI at each step
Input: ME transitions lead through: New Lead → Contacted → Meeting Scheduled → Requirement Gathering → Proposal Sent → Negotiation. Each step via stage selector.
Expected Output: Each transition succeeds with toast. Current stage updates. Options update dynamically per stage.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-010 (Negative):

Description: Selecting a skipped/illegal stage shows inline error
Input: ME at "New Lead" attempts to select "Meeting Scheduled" (not in allowed list for New Lead). The option is not available in the dropdown.
Expected Output: The invalid option is not rendered in the dropdown. ME cannot select it. No API call is made for non-existent options.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-011 (Negative):

Description: API 422 for illegal transition shows error toast
Input: ME bypasses frontend restrictions (e.g., via API console) and attempts illegal transition. Mock API returns 422.
Expected Output: Error toast: “Invalid stage transition. Allowed transitions from [current stage]: [list]”. Stage selector reverts to previous valid stage.
Traceability: STORY-2.4.1, C1-55
test-ep-2.4.1-012 (Negative):

Description: API network error during stage transition
Input: ME selects valid stage. Mock API returns 500.
Expected Output: Error toast: “Failed to update stage. Please try again.” Stage selector stays at current stage. User can retry.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-013 (Edge):

Description: Select same stage (no-op) — no API call or toast
Input: ME clicks the currently selected stage "Contacted" again.
Expected Output: No API call is made. No toast. Stage selector remains unchanged.
Traceability: STORY-2.4.1, C1-54, C1-55
3. Lost Reason — Mandatory Capture
Purpose: When Stage = Lost is selected, a modal forces the user to pick a Lost Reason from a predefined enum before saving.

test-ep-2.4.1-014 (Positive):

Description: Lost Reason modal opens when Lost is selected
Input: ME selects "Lost" from stage selector (lead at any active stage).
Expected Output: A modal dialog opens with title “Close as Lost”. A required dropdown labeled “Lost Reason” is present with options: Budget, Competitor, Not Interested, No Response, Timing, Other. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-015 (Positive):

Description: Submit Lost with valid reason closes modal and updates lead
Input: ME selects "Budget" from Lost Reason dropdown, clicks “Confirm”. Mock POST /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Lost”. Stage selector now shows "Lost" as disabled (closed). Lead status shows “Lost” with the reason displayed.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-016 (Negative):

Description: Submit Lost without selecting a reason
Input: ME opens Lost modal, clicks “Confirm” without selecting a reason.
Expected Output: Inline validation: “Please select a lost reason.” Dropdown border turns red. No API call made. Modal remains open.
Traceability: STORY-2.4.1, C1-56
test-ep-2.4.1-017 (Negative):

Description: API error during Lost close
Input: ME selects reason, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open. User can retry or cancel.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-018 (Edge):

Description: Cancel Lost modal
Input: ME opens Lost modal, clicks “Cancel” or presses Escape.
Expected Output: Modal closes. Stage selector reverts to previous stage. No API call made. Lead unchanged.
Traceability: STORY-2.4.1, C1-54, C1-56
4. Won Closure — Deal Value & Closure Date Capture
Purpose: When Stage = Won is selected, a modal forces entry of Final Deal Value and Closure Date before saving.

test-ep-2.4.1-019 (Positive):

Description: Won Closure modal opens when Won is triggered
Input: ME clicks “Close as Won” button/option (lead at "Negotiation").
Expected Output: A modal dialog opens with title “Close as Won”. Input fields: “Final Deal Value” (numeric input) and “Closure Date” (date picker). Both fields are marked as required. “Confirm” and “Cancel” buttons present.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-020 (Positive):

Description: Submit Won with valid values closes modal and updates lead
Input: ME enters 50000 in deal value, selects 2026-07-15 as closure date, clicks “Confirm”. Mock PUT /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Won with deal value of $50,000”. Stage selector shows "Won" as disabled. Lead detail shows Won badge, deal value, and closure date.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-021 (Positive):

Description: Submit Won with zero deal value (free service)
Input: ME enters 0 as deal value, valid closure date, clicks “Confirm”.
Expected Output: HTTP 200 OK. Success toast shown.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-022 (Negative):

Description: Submit Won without deal value
Input: ME leaves deal value empty, enters valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Final deal value is required.” Input border turns red. No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-023 (Negative):

Description: Submit Won without closure date
Input: ME enters valid deal value, leaves closure date empty, clicks “Confirm”.
Expected Output: Inline validation: “Closure date is required.” No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-024 (Negative):

Description: Submit Won with negative deal value
Input: ME enters -1000 as deal value, valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Deal value cannot be negative.” Input border turns red.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-025 (Negative):

Description: API error during Won close
Input: ME enters valid values, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-026 (Edge):

Description: Cancel Won modal
Input: ME opens Won modal, enters values, clicks “Cancel”.
Expected Output: Modal closes. Stage selector reverts. No API call made.
Traceability: STORY-2.4.1, C1-54, C1-57
5. Lead History — Timeline Display
Purpose: The Lead Detail page displays a chronological timeline of all stage changes. Entries are read-only and immutable.

test-ep-2.4.1-027 (Positive):

Description: Timeline displays stage change events in chronological order
Input: Lead has history: New Lead → Contacted → Meeting Scheduled → Proposal Sent. Navigate to Lead Detail and scroll to Timeline section.
Expected Output: Timeline shows 3 stage change entries sorted newest first. Each entry displays: event type icon (stage change), Previous Stage → New Stage, Actor name, Timestamp (relative or absolute). The most recent transition is highlighted.
Traceability: STORY-2.4.1, C1-54, C1-58
test-ep-2.4.1-028 (Positive):

Description: Timeline includes close and reopen events with details
Input: Lead has transitioned: Contacted → Lost (Budget) → Reopened → Contacted → Won ($50k). …





Message vishnu







Shift + Enter to add a new line




EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is marked as read (badge count decrements). Browser navigates to /app/leads/{id} (or equivalent). Lead detail page loads for the assigned lead.
Traceability: STORY-2.3.1, C1-47, C1-52
test-ep-2.3.1-029 (Positive):

Description: Notification badge updates after viewing all notifications
Input: ME has 3 unread notifications (including the new assignment). Opens dropdown and clicks “Mark all as read” or views them individually.
Expected Output: Badge disappears or shows 0. Notification items show as read (no bold/faded background).
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-030 (Edge):

Description: Empty notification state
Input: ME clicks notification bell with no notifications.
Expected Output: Dropdown shows empty state: “No new notifications.” No badge on bell icon.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-031 (Edge):

Description: Notifications persist across page navigation
Input: ME sees new notification, navigates to another page within the app.
Expected Output: Badge count persists (if unread). Notification list remains intact.
Traceability: STORY-2.3.1, C1-52
5. Role-Based Access — ME vs Admin
Purpose: Marketing Executives cannot access the Assign/Reassign action; the control is hidden (not just disabled) for that role.

test-ep-2.3.1-032 (Negative):

Description: Assign/Reassign button is hidden on Lead Detail for ME
Input: Navigate to /app/leads/{id} as a Marketing Executive. The lead is assigned to this ME.
Expected Output: No “Assign/Reassign” button is rendered anywhere on the page. The owner section shows the current owner name but no action to change it. Inspecting the DOM confirms the button element is absent (not just display:none or disabled).
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-033 (Negative):

Description: Bulk assign button is hidden on Lead List for ME
Input: Navigate to /app/leads as a Marketing Executive.
Expected Output: No row checkboxes are rendered. No bulk action bar appears at any point. No “Assign” option is available. ME can only view their own leads, not reassign them.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-034 (Negative):

Description: ME cannot access Admin route via direct URL manipulation
Input: ME types /admin/leads/{id} directly in browser URL bar.
Expected Output: Page shows “Access Denied” message or redirects to /app/leads. No assign functionality is accessible. API calls to admin endpoints return 403 and are handled gracefully.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-035 (Negative):

Description: Admin sees assign action, ME does not — visual comparison
Input: Login as Admin, navigate to Lead Detail — assign button visible. Logout. Login as ME, navigate to same lead — assign button absent.
Expected Output: Admin sees assign button. ME does not see assign button. This confirms role-based conditional rendering.
Traceability: STORY-2.3.1, C1-47
6. Lead History — Timeline Display
Purpose: The Lead Detail page displays an immutable timeline showing assignment events with previous owner, new owner, reason, actor, and timestamp.

test-ep-2.3.1-038 (Positive):
Description: Timeline displays assignment event with all required fields after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 with reason “Workload rebalancing”. Navigate to the Lead Detail page /admin/leads/{id} and scroll to the “Timeline” or “Lead History” section.
Expected Output: The timeline displays an immutable entry of type “Assigned/Reassigned” (or similar). The entry contains: Previous Owner showing Old ME’s name (EMP-00002), New Owner showing New ME’s name (EMP-00003), Reason showing “Workload rebalancing”, Actor showing Admin’s name (EMP-00001), and Timestamp showing the UTC date/time of the reassignment. The entry has an assignment-specific icon (e.g., swap/user-change icon). No edit or delete controls are present on any timeline entry. The entry is read-only for all roles including Admin.
Traceability: STORY-2.3.1, C1-47, C1-51
End of Frontend Test Cases for STORY-2.3.1 — Total: 38 test cases (Sections 1–6)





Search pentaxial Technologies



PT

Home
1

DMs
2

Activity
3

Files
4

Later
5

More
0

pentaxial Technologies


Find a conversation…







Messages

CanvasListFolder
Loading history…
vishnu
  9:56 AM
ba776e56286421e6df9fdd76b59c8f487e4f9d440743b5bb33c5d030ac48beb4
vishnu
  10:52 AM
[TASK-1.2.1-01] Build User Master list screen (search, filter by role/status)
Abirami K
  11:47 AM
7 files
 

Download all
image.png
image.png
image.png
image.png
image.png
image.png
image.png
11:52
"success": true,
    "data": [
        {
            "id": "83d94322-f63f-43f2-b791-a55a55679562",
            "employee_id": "EMP-00005",
            "name": "John",
            "email": "john@test.com",
            "mobile": "9876543210",
            "role": "Marketing Executive",
            "status": "inactive",
            "failedLoginAttempts": 0,
            "lockoutUntil": null,
            "lastLoginAt": null,
            "createdAt": "2026-06-28T23:27:24.387Z",
            "updatedAt": "2026-06-28T23:27:24.387Z"
        },
        {
            "id": "bd460208-3d59-43ef-86c6-523dabe8edd9",
            "employee_id": "EMP-00004",
            "name": "vishnu c",
            "email": "vishnu.off.2004@gmail.com",
            "mobile": null,
            "role": "admin",
            "status": "active",
            "failedLoginAttempts": 0,
            "lockoutUntil": null,
            "lastLoginAt": "2026-06-29T00:36:25.266Z",
            "createdAt": "2026-06-27T06:42:01.000Z",
            "updatedAt": "2026-06-27T01:12:14.274Z"
        },
        {
            "id": "e26030ed-65ec-449c-91fd-1fa7b0fb3670",
            "employee_id": "EMP-00003",
            "name": "Admin CRM",
            "email": "admin@crm.com",
            "mobile": null,
            "role": "user",
            "status": "active",
            "failedLoginAttempts": 3,
            "lockoutUntil": null,
            "lastLoginAt": "2026-06-27T00:57:47.157Z",
            "createdAt": "2026-06-27T00:28:25.754Z",
            "updatedAt": "2026-06-27T00:53:56.933Z"
        },
        {
            "id": "1e9b48ce-52de-4677-8476-46f63e7b4dd7",
            "employee_id": "EMP-00002",
            "name": "Patched Test",
            "email": "pathtest@test.com",
            "mobile": null,
            "role": "user",
            "status": "active",
            "failedLoginAttempts": 1,
            "lockoutUntil": null,
            "lastLoginAt": null,
            "createdAt": "2026-06-27T00:07:18.937Z",
            "updatedAt": "2026-06-27T00:07:20.213Z"
        },
        {
            "id": "b3a79088-e29c-4e42-93e5-43ec934678c0",
            "employee_id": "EMP-00001",
            "name": "Super Admin",
            "email": "admin@example.com",
            "mobile": null,
            "role": "super_admin",
            "status": "locked",
            "failedLoginAttempts": 4,
            "lockoutUntil": "2026-06-27T09:51:25.353Z",
            "lastLoginAt": "2026-06-27T02:41:49.517Z",
            "createdAt": "2026-06-26T23:46:35.522Z",
            "updatedAt": "2026-06-27T00:35:08.941Z"
        }
    ]
}
API : api/admin/users
11:53
PATCH: /api/admin/users/83d94322-f63f-43f2-b791-a55a55679562/deactivate
{
    "success": true,
    "message": "User deactivated successfully.",
    "data": {
        "id": "83d94322-f63f-43f2-b791-a55a55679562",
        "employee_id": "EMP-00005",
        "name": "John",
        "email": "john@test.com",
        "mobile": "9876543210",
        "role": "Marketing Executive",
        "status": "inactive"
    }
}
11:53
POST: /api/auth/login
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJkNDYwMjA4LTNkNTktNDNlZi04NmM2LTUyM2RhYmU4ZWRkOSIsImVtYWlsIjoidmlzaG51Lm9mZi4yMDA0QGdtYWlsLmNvbSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc4MjcxMzE4MiwiZXhwIjoxNzgyNzE0MDgyfQ.wUqZx9gW6oO2UFtFBztaw39zDaO6Rvv67XjJdq2LDi4",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJkNDYwMjA4LTNkNTktNDNlZi04NmM2LTUyM2RhYmU4ZWRkOSIsImVtYWlsIjoidmlzaG51Lm9mZi4yMDA0QGdtYWlsLmNvbSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc4MjcxMzE4MiwiZXhwIjoxNzgzMzE3OTgyfQ.zAva1RlV4xH-stYgiqx6STHyXcmdN0bqmHIZjULAnsw",
    "token_expires_in": "7d",
    "user": {
        "id": "bd460208-3d59-43ef-86c6-523dabe8edd9",
        "employee_id": "EMP-00004",
        "name": "vishnu c",
        "email": "vishnu.off.2004@gmail.com",
        "mobile": null,
        "role": "Admin",
        "status": "active"
    },
    "redirect": "/admin/dashboard",
    "isFirstLogin": false
}
11:54
POST: api/auth/forgot-password
{
    "success": true,
    "message": "If email exists, a password reset link has been sent."
}
11:55
POST:  /reset-password
{
    "success": true,
    "message": "Password reset done"
}
Abirami K
  12:01 PM
PATCH: /api/admin/users/83d94322-f63f-43f2-b791-a55a55679562/deactivate
vishnu
  12:12 PM
54c19606-357c-410a-a421-e16b93fcf051.mock.pstmn.io
Abirami K
  12:21 PM
{"name":"John","email":"john@test.com","mobile":"9876543210","role":"Marketing Executive","status":"Active"}
post: localhost/api/admin/users
Abirami K
  12:30 PM
{
    "success": true,
    "message": "User created successfully.",
    "data": {
        "id": "4203b370-cd2e-4e35-a6ce-8b45b6a4b951",
        "employee_id": "EMP-00007",
        "name": "Joh1n",
        "email": "john1@test.com",
        "mobile": "9876563210",
        "role": "Marketing Executive",
        "status": "active",
        "tempPassword": "I9.%+GL(>2HOt$"
    }
}
vishnu
  12:40 PM
api/audit-log
Abirami K
  12:48 PM
api/admin/audit-log
12:51
"success": true,
    "data": [
        {
            "id": "743ff841-b7d2-4434-89cc-7e0e882b4eac",
            "user_id": "bd460208-3d59-43ef-86c6-523dabe8edd9",
            "action": "LOGIN_SUCCESS",
            "resource": "Auth",
            "resourceId": "",
            "details": "Successful login",
            "ipAddress": "::1",
            "userAgent": "PostmanRuntime/7.54.0",
            "result": "Success",
            "createdAt": "2026-06-29T01:46:47.513Z",
            "email": "vishnu.off.2004@gmail.com"
        }
}
Abirami K
  2:51 PM
localhost/api/admin/users/83d94322-f63f-43f2-b791-a55a55679562
{
    "success": true,
    "message": "User updated successfully.",
    "data": {
        "id": "83d94322-f63f-43f2-b791-a55a55679562",
        "email": "john2@test.com",
        "firstName": "John",
        "lastName": "John",
        "role": "Marketing Executive",
        "accountStatus": "inactive",
        "failedLoginAttempts": 0,
        "lockoutUntil": null,
        "lastLoginAt": null,
        "createdAt": "2026-06-28T23:27:24.387Z",
        "updatedAt": "2026-06-28T23:27:24.387Z",
        "employee_id": "EMP-00005",
        "name": "Joheen",
        "mobile": "9877863810"
    }
}
2:52
PATCH: /api/admin/users/83d94322-f63f-43f2-b791-a55a55679562/deactivate
2:54
{
    "success": true,
    "message": "User deactivated successfully.",
    "data": {
        "id": "b3a79088-e29c-4e42-93e5-43ec934678c0",
        "employee_id": "EMP-00001",
        "name": "Super Admin",
        "email": "admin@example.com",
        "mobile": null,
        "role": "super_admin",
        "status": "inactive"
    }
}
Abirami K
  3:38 PM
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJkNDYwMjA4LTNkNTktNDNlZi04NmM2LTUyM2RhYmU4ZWRkOSIsImVtYWlsIjoidmlzaG51Lm9mZi4yMDA0QGdtYWlsLmNvbSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc4MjcyNDc3MiwiZXhwIjoxNzgzMzI5NTcyfQ.xC0g0lYRc7qskUQU0dlNCxa-kv63B6HowabbT_zDtec
Abirami K
  5:15 PM
image.png
 
image.png
vishnu
  10:40 AM
frontend.md
 

frontend.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome, ensuring the client-side UI is intuitive, enforces immediate field validation, provides interactive warning feedback, and respects role-based view restrictions. Tech Stack: React (Vite) / TailwindCSS Total Test Cases: 30

Table of Contents
FEAT-2.1: Lead Entry Form
FEAT-2.2: Lead List Screen
FEAT-2.3: Lead Assignment & Reassignment
FEAT-2.4: Lead Status & Stage Management
1. FEAT-2.1: Lead Entry Form
TEST-EP2-LEADS-001 (Positive):

Description: Verify Lead Entry Form inputs render correctly with sections
Input: Open Lead Entry Form page.
Expected Output: Sections (Company Info, Contact Info, Lead Info) are clearly demarcated. Inputs present: Company Name, Contact Person, Mobile Number, Email, Website, City, Lead Source, Business Category, Business Sub-Category, Service Interested, Priority, Estimated Value. Mandatory fields marked with red asterisks (*).
Traceability: STORY-2.1.1 AC-1, C1-26
TEST-EP2-LEADS-002 (Negative):

Description: UI form submission with empty mandatory fields
Input: Click “Save” on empty Lead Entry Form.
Expected Output: Form submission is blocked. Input borders for Company Name, Contact Person, Mobile, Lead Source, Business Category, Service Interested, and Priority turn red. Inline error text appears under each: “[Field Name] is required.” Focus moves to the first invalid field.
Traceability: STORY-2.1.1 AC-3
TEST-EP2-LEADS-003 (Negative):

Description: Mobile Number field format input validation
Input: Type non-numeric characters (e.g. “98765A3210”) or string of length 8 in Mobile input, then click Save or blur input.
Expected Output: Inline warning displayed: “Mobile Number must be exactly 10 digits.” System prevents character insertion if regex input mask is implemented, or marks input invalid.
Traceability: STORY-2.1.1 AC-3, BR-2
TEST-EP2-LEADS-004 (Negative):

Description: Email field format input validation
Input: Type “not-an-email” in Email input, blur the input.
Expected Output: Inline validation message displayed: “Invalid email format.” Submit button remains disabled or block triggers on submit.
Traceability: STORY-2.1.1 AC-3
TEST-EP2-LEADS-005 (Positive):

Description: Business Category and Sub-Category cascading dropdown interaction
Input: Select “IT Services” in Business Category dropdown, then open Business Sub-Category dropdown.
Expected Output: Sub-Category dropdown options only display options belonging to “IT Services” (e.g. “Web Development”, “Mobile Apps”). Change Category to “Retail”; verify Sub-Category options immediately refresh to Retail-specific children, clearing previous selection.
Traceability: STORY-2.1.1 AC-5, BR-3
TEST-EP2-LEADS-006 (Positive):

Description: Duplicate Mobile Number warning modal presentation
Input: Enter a mobile number that belongs to an existing open lead, then click Save.
Expected Output: Non-blocking modal/dialog pops up: “A lead with this mobile number already exists (LD-2026-00001) — Continue / View Existing”. Form is not immediately submitted.
Traceability: STORY-2.1.1 AC-2, BR-2
TEST-EP2-LEADS-007 (Positive):

Description: Duplicate Mobile Number warning — Click Continue
Input: Trigger duplicate warning modal, click “Continue” button.
Expected Output: Modal closes. Client sends save request to backend (bypass_duplicate_warning = true). Lead is successfully created and user redirected to Lead Detail page.
Traceability: STORY-2.1.1 AC-2
TEST-EP2-LEADS-008 (Positive):

Description: Duplicate Mobile Number warning — Click View Existing
Input: Trigger duplicate warning modal, click “View Existing” button.
Expected Output: Modal closes. Lead creation cancelled. User is redirected to Lead Detail page for LD-2026-00001 (the existing duplicate lead).
Traceability: STORY-2.1.1 AC-2
2. FEAT-2.2: Lead List Screen
TEST-EP2-LEADS-009 (Positive):

Description: Paginated table display and navigation
Input: Open Lead List screen.
Expected Output: Table displays up to 25 rows. Pagination component (Previous, Next, Page numbers, and “Showing 1-25 of [Total]”) is rendered at the bottom. Clicking “Next” loads the next 25 records.
Traceability: STORY-2.2.1 AC-4
TEST-EP2-LEADS-010 (Positive):

Description: Real-time search query filtering (2+ characters)
Input: Type “Tech” into the search bar.
Expected Output: Table contents filter immediately in real-time (with debouncing, e.g. 300ms) to display only leads containing “Tech” in ID, Company, Contact, or Mobile.
Traceability: STORY-2.2.1 AC-2
TEST-EP2-LEADS-011 (Positive):

Description: Real-time search query bypass (less than 2 characters)
Input: Clear search input, type “T”.
Expected Output: Table does not filter; it shows all active results until a second character is typed.
Traceability: STORY-2.2.1 AC-2
TEST-EP2-LEADS-012 (Positive):

Description: Multi-filter selection combinations
Input: Select Status = “New Lead” and Priority = “Hot”.
Expected Output: List updates dynamically to show only leads matching both Status = “New Lead” AND Priority = “Hot”. Active filters are displayed as chips/badges that can be cleared individually.
Traceability: STORY-2.2.1 AC-3
TEST-EP2-LEADS-013 (Positive):

Description: Sortable columns interaction
Input: Click “Created Date” column header once, then click it again.
Expected Output: First click sorts leads by Created Date ascending; chevron points up. Second click sorts by Created Date descending; chevron points down. Repeat for Priority, Status, and Estimated Value.
Traceability: STORY-2.2.1
TEST-EP2-LEADS-014 (Positive):

Description: Role-based filters display check
Input: Log in as: (a) Marketing Executive, (b) Admin, and navigate to Lead List.
Expected Output: As Marketing Executive, the “Assigned To” filter dropdown is hidden. As Admin, the “Assigned To” filter dropdown is visible, allowing selection of any team member.
Traceability: STORY-2.2.1 AC-1, BR-1
TEST-EP2-LEADS-015 (Negative):

Description: Client-side routing restriction for unassigned leads
Input: ME logged in as user_id = 101 attempts to navigate directly to /leads/LD-2026-99999 (owned by 102).
Expected Output: Client router blocks page view, rendering a customized “Access Denied” page or redirecting to Dashboard with an error toast message: “Access denied. You do not own this lead.”
Traceability: STORY-2.2.1 AC-5, BR-1
3. FEAT-2.3: Lead Assignment & Reassignment
TEST-EP2-LEADS-016 (Negative):

Description: Reassign button visibility for non-Admin
Input: Log in as Marketing Executive, open Lead Detail or Lead List page.
Expected Output: No “Assign Owner” or “Reassign” buttons, dropdowns, or checkboxes are visible anywhere on the screen.
Traceability: STORY-2.3.1 AC-4
TEST-EP2-LEADS-017 (Positive):

Description: Admin reassign modal interactions
Input: Log in as Admin, open Lead Detail, click “Reassign” button.
Expected Output: Reassign Owner modal overlay opens. Contains dropdown of active Marketing Executives and a text area for “Reassignment Reason”. Click cancel; modal closes, making no changes.
Traceability: STORY-2.3.1 AC-1
TEST-EP2-LEADS-018 (Negative):

Description: Admin reassign modal validation
Input: In Reassign modal, select a new owner but leave Reassignment Reason empty, then click Submit.
Expected Output: Modal submission blocked. Reassignment Reason input border turns red with error message: “Reassignment reason is required.”
Traceability: STORY-2.3.1 AC-1
TEST-EP2-LEADS-019 (Positive):

Description: Bulk reassignment UI controls (Admin only)
Input: Log in as Admin on Lead List, check multiple lead checkboxes, click “Bulk Reassign” button.
Expected Output: Reassignment modal opens showing number of selected leads (e.g. “Reassigning 5 leads”). Enforces mandatory New Owner and Reassignment Reason. On success, checkboxes clear and table records update.
Traceability: STORY-2.3.1, C1-47
4. FEAT-2.4: Lead Status & Stage Management
TEST-EP2-LEADS-020 (Positive):

Description: Stage selector rendering
Input: Open Lead Detail page for a lead in “New Lead” stage.
Expected Output: Stage progress bar or dropdown selector is visible showing current stage highlighted as “New Lead”.
Traceability: STORY-2.4.1
TEST-EP2-LEADS-021 (Positive):

Description: Dynamic Lost Reason field display
Input: In Stage dropdown, select “Lost”.
Expected Output: Lost Reason dropdown input dynamically appears on the form below the selector.
Traceability: STORY-2.4.1 AC-1
TEST-EP2-LEADS-022 (Negative):

Description: Save stage transition to Lost with missing reason
Input: Select stage “Lost” in dropdown, leave Lost Reason empty, click Save/Submit.
Expected Output: Transition blocked. Validation error shown: “Please select a reason for losing this lead.”
Traceability: STORY-2.4.1 AC-1
TEST-EP2-LEADS-023 (Positive):

Description: Dynamic Deal Value and Closure Date fields display
Input: In Stage dropdown, select “Won”.
Expected Output: Final Deal Value input (currency field) and Closure Date input (date picker) dynamically appear on the form.
Traceability: STORY-2.4.1 AC-2
TEST-EP2-LEADS-024 (Negative):

Description: Save stage transition to Won with missing details
Input: Select stage “Won” in dropdown, leave Final Deal Value and Closure Date empty, click Save/Submit.
Expected Output: Transition blocked. Inline errors shown: “Final Deal Value is required” and “Closure Date is required.”
Traceability: STORY-2.4.1 AC-2
TEST-EP2-LEADS-025 (Positive):

Description: Allowed stage transitions validation in UI selection
Input: Current lead stage is “New Lead”. Open Stage selector dropdown.
Expected Output: Options “Contacted”, “Hold”, and “Lost” are enabled/selectable. Options “Meeting Scheduled”, “Requirement Gathering”, “Proposal Sent”, “Negotiation”, and “Won” are disabled/greyed out to prevent skipped transitions.
Traceability: STORY-2.4.1 AC-5, BR-1
TEST-EP2-LEADS-026 (Negative):

Description: Closed Lead fields disabled for Marketing Executive
Input: ME opens a lead where stage = “Won” or “Lost”.
Expected Output: Stage selector dropdown, contact details, company details inputs, and “Save/Edit” buttons are greyed out and disabled. Header alert banner displayed: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1 AC-4
TEST-EP2-LEADS-027 (Positive):

Description: Admin override options for Closed Leads
Input: Admin opens a lead where stage = “Won” or “Lost”.
Expected Output: Alert banner displayed: “This lead is closed.” Beside it, an enabled “Override/Reopen” button is visible. Clicking it opens a dialog demanding a reopen reason before unlocking input fields.
Traceability: STORY-2.4.1 AC-4
TEST-EP2-LEADS-028 (Positive):

Description: Lead History timeline widget display
Input: Open Lead Detail page.
Expected Output: A timeline widget displays historical events in reverse chronological order (latest on top), displaying: “Lead Created by [Name]”, “Stage changed from [Old] to [New] by [Name]”, “Owner changed from [Old] to [New] by Admin”, with respective timestamps.
Traceability: STORY-2.4.1 AC-3, STORY-2.1.1 AC-4, STORY-2.3.1 AC-3
TEST-EP2-LEADS-029 (Positive):

Description: Saved Views filter dropdown navigation
Input: Click Saved Views dropdown on Lead List page, select “My Hot Leads”.
Expected Output: The view updates, auto-applying Priority = “Hot” filter and displaying results. The dropdown label updates to “My Hot Leads”.
Traceability: STORY-2.2.1, C1-44
TEST-EP2-LEADS-030 (Positive):

Description: UI input fields constraint validation
Input: Type a value of 999999999999.99 in Estimated Value or exceed 255 characters in Company Name on Lead form.
*Expected Output…
vishnu
  10:49 AM
frontend.md
 

frontend.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome, ensuring the client-side UI is intuitive, enforces immediate field validation, provides interactive warning feedback, and respects role-based view restrictions. Tech Stack: React (Vite) / TailwindCSS Total Test Cases: 30

📋 Table of Contents
Configurable Dropdown Feeds (APIs 1 & 5)
Admin Settings Management (APIs 2-4 & 6-8)
Real-time Duplicate Validation (APIs 9 & 10)
Lead Entry Form Submission (API 11)
Role-restricted Details Loading (APIs 12 & 13)
Timeline & System Audit Widgets (APIs 14-16)
1. Configurable Dropdown Feeds (APIs 1 & 5)
TEST-EP2-LEADS-001 (Positive):

Description: Verify “Lead Source” dropdown options load dynamically from backend
Input: User navigates to Lead Entry Form. React lifecycle triggers GET /admin/lead-sources.
Expected Output: Lead Source dropdown options match the list returned by the API (e.g. “Website”, “Referral”). Loading skeletons are shown until API resolves successfully.
Traceability: STORY-2.1.1 AC-1, TASK-2.1.1-05
TEST-EP2-LEADS-002 (Negative):

Description: Verify form behavior when Lead Source dropdown loading API fails
Input: User navigates to Lead Entry Form. GET /admin/lead-sources returns a 500 error.
Expected Output: Dropdown is disabled. A small inline warning displays: “Failed to load lead sources. Reload”. Form submission button is disabled.
Traceability: STORY-2.1.1 AC-3
TEST-EP2-LEADS-003 (Positive):

Description: Verify “Services Interested” multi-select loads options dynamically
Input: Open Lead Entry Form. React triggers GET /admin/services.
Expected Output: The multi-select checkbox group displays all active services (e.g. “Web Development”, “SEO”).
Traceability: STORY-2.1.1 AC-1, TASK-2.1.1-07
2. Admin Settings Management (APIs 2-4 & 6-8)
TEST-EP2-LEADS-004 (Positive):

Description: Admin UI for creating new Lead Source
Input: Log in as Admin, navigate to Config Settings, open “Lead Sources” tab, type “Event Sponsorship” and click “Add Source”. UI fires POST /admin/lead-sources.
Expected Output: The new lead source is successfully added and appears instantly in the list. A success toast “Lead Source added successfully” appears.
Traceability: STORY-3.1.1
TEST-EP2-LEADS-005 (Negative):

Description: Non-Admin UI blocks access to Config Settings
Input: Log in as Marketing Executive, attempt to route to /admin/settings.
Expected Output: React Router blocks access and redirects to Dashboard with alert “Access Denied. Admins only.”
Traceability: STORY-3.1.1 AC-4
TEST-EP2-LEADS-006 (Positive):

Description: Admin UI for editing a Lead Source name
Input: Open Lead Sources panel, click “Edit” on “Website”, change name to “Corporate Portal”, click Save. UI fires PUT /admin/lead-sources/1.
Expected Output: Modal closes. The list item name updates to “Corporate Portal”.
Traceability: STORY-3.1.1
TEST-EP2-LEADS-007 (Positive):

Description: Admin UI for de-activating a Lead Source
Input: Click “Deactivate” toggle on “Referral” list item. UI fires PATCH /admin/lead-sources/2/deactivate.
Expected Output: Toggle turns grey. A badge next to referral updates to “Inactive”. Open the Lead Entry form; verify “Referral” is no longer visible in dropdown.
Traceability: STORY-3.1.1 AC-2
TEST-EP2-LEADS-008 (Positive):

Description: Admin UI for de-activating a Service
Input: Click “Deactivate” toggle on “App Development” in Services config panel. UI fires PATCH /admin/services/:id/deactivate.
Expected Output: Service status shifts to inactive. The item is removed from the Lead Entry form multi-select group.
Traceability: STORY-3.1.1 AC-2
3. Real-time Duplicate Validation (APIs 9 & 10)
TEST-EP2-LEADS-009 (Positive):

Description: Real-time Email check triggers warning on blur
Input: Type “existing@test.com” into the Email field, then click outside (blur). UI fires GET /marketing/leads/check-email?email=existing@test.com.
Expected Output: Warning text appears below Email input: “Warning: A lead with this email already exists. [View Lead]”. Border turns orange.
Traceability: STORY-2.1.1 AC-2, TASK-2.1.1-09
TEST-EP2-LEADS-010 (Positive):

Description: Real-time Mobile check triggers duplicate modal dialog on blur
Input: Type “9876543210” (existing mobile) into Mobile input, then blur. UI fires GET /marketing/leads/check-mobile?mobile=9876543210.
Expected Output: Non-blocking modal alert appears: “A lead with this mobile number already exists (LD-2026-00001) — Continue / View Existing”.
Traceability: STORY-2.1.1 AC-2, TASK-2.1.1-09
TEST-EP2-LEADS-011 (Positive):

Description: Interactive Modal option “Continue” logic
Input: Trigger duplicate mobile modal, click “Continue”.
Expected Output: Modal closes. The warning is dismissed, and user is permitted to proceed with editing or saving the new form.
Traceability: STORY-2.1.1 AC-2
TEST-EP2-LEADS-012 (Positive):

Description: Interactive Modal option “View Existing” redirect logic
Input: Trigger duplicate mobile modal, click “View Existing”.
Expected Output: Form closes. User is redirected to /leads/LD-2026-00001 details view.
Traceability: STORY-2.1.1 AC-2
4. Lead Entry Form Submission (API 11)
TEST-EP2-LEADS-013 (Positive):

Description: Submit valid Lead Entry Form
Input: Fill in all mandatory fields, click “Save”. UI fires POST /marketing/leads.
Expected Output: Form submit button shows a loading spinner. Upon success, redirected to /leads/LD-2026-00005. A success toast “Lead LD-2026-00005 created successfully” is shown.
Traceability: STORY-2.1.1 AC-1
TEST-EP2-LEADS-014 (Negative):

Description: Handle validation failure response from main creation API
Input: Click Save. API returns 400 Bad Request with field errors.
Expected Output: UI stays on the form. Input fields highlight red. Toast shows “Please fix the highlights errors before saving.”
Traceability: STORY-2.1.1 AC-3
5. Role-restricted Details Loading (APIs 12 & 13)
TEST-EP2-LEADS-015 (Positive):

Description: Marketing Executive opens Lead Details page (uses API-12)
Input: ME user logs in, navigates to /leads/LD-2026-00001. UI triggers GET /marketing/leads/LD-2026-00001.
Expected Output: Lead details render. Action buttons like “Reassign Owner” are completely hidden from the layout.
Traceability: STORY-2.2.1 AC-1, STORY-2.3.1 AC-4
TEST-EP2-LEADS-016 (Negative):

Description: ME attempts direct page routing to unassigned lead detail
Input: ME user navigates directly to /leads/LD-2026-99999 (owned by someone else). API returns 403.
Expected Output: UI catches the 403 response and renders an “Access Denied” error boundary screen.
Traceability: STORY-2.2.1 AC-5
TEST-EP2-LEADS-017 (Positive):

Description: Admin opens Lead Details page (uses API-13)
Input: Admin user logs in, navigates to /leads/LD-2026-00001. UI triggers GET /admin/leads/LD-2026-00001.
Expected Output: Lead details render. Admin-specific controls, such as the “Reassign Owner” button and owner change dropdown, are visible and enabled.
Traceability: STORY-2.2.1 AC-1, STORY-2.3.1
6. Timeline & System Audit Widgets (APIs 14-16)
TEST-EP2-LEADS-018 (Positive):

Description: Render Lead History widget for Marketing Executive (uses API-14)
Input: ME opens owned Lead Details page, opens “History Timeline” tab. UI triggers GET /marketing/leads/LD-2026-00001/lead-history.
Expected Output: A vertical list of timeline items renders displaying logs (e.g. “Lead Created by Sulabh Varshney on 2026-06-26”).
Traceability: STORY-2.4.1 AC-3
TEST-EP2-LEADS-019 (Positive):

Description: Render Lead History widget for Admin (uses API-15)
Input: Admin opens any Lead Details page, opens “History Timeline” tab. UI triggers GET /admin/leads/LD-2026-00001/lead-history.
Expected Output: Renders full chronological modifications log (including details on override reason entries).
Traceability: STORY-2.4.1
TEST-EP2-LEADS-020 (Positive):

Description: Render System-wide Audit Log panel for Admin (uses API-16)
Input: Log in as Admin, navigate to /admin/audit-logs. UI triggers GET /admin/lead-history.
Expected Output: Renders a paginated, scrollable log table mapping overall operations across all CRM leads. Columns display Lead ID, Action, Actor, Reassignment/Override Reason, and Timestamp.
Traceability: EPIC-2
7. Interactive UI & Form Enhancements
TEST-EP2-LEADS-021 (Positive):

Description: Category & Sub-Category cascading selection interactivity
Input: Select “Category A” on the Lead entry form.
Expected Output: Sub-Category dropdown immediately filters, displaying only children of Category A. Previously selected sub-category is reset.
Traceability: STORY-2.1.1 AC-5
TEST-EP2-LEADS-022 (Positive):

Description: Stage Transition “Won” triggers dynamic fields layout
Input: Select stage “Won” in Stage progression dropdown.
Expected Output: Form dynamically expands to show mandatory “Final Deal Value” (input with currency symbol prefix) and “Closure Date” (date selection picker) fields.
Traceability: STORY-2.4.1 AC-2
TEST-EP2-LEADS-023 (Positive):

Description: Stage Transition “Lost” triggers dynamic fields layout
Input: Select stage “Lost” in Stage progression dropdown.
Expected Output: Form dynamically expands to show mandatory “Lost Reason” dropdown.
Traceability: STORY-2.4.1 AC-1
TEST-EP2-LEADS-024 (Negative):

Description: Disabling invalid stage transitions in dropdown selector
Input: Open stage selector for a lead in “New Lead” stage.
Expected Output: “Contacted”, “Hold”, and “Lost” options are enabled. Skipped stages (e.g. “Won”, “Proposal Sent”) are styled differently and disabled/unclickable in dropdown.
Traceability: STORY-2.4.1 AC-5
TEST-EP2-LEADS-025 (Negative):

Description: Closed Lead form controls locked for ME
Input: ME opens a lead with stage “Won” or “Lost”.
Expected Output: The entire page edit interface shifts to read-only. Inputs disabled. Banner text displayed: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1 AC-4
TEST-EP2-LEADS-026 (Positive):

Description: Admin override buttons rendering on Closed Leads
Input: Admin opens a lead with stage “Won” or “Lost”.
Expected Output: Alert banner shown containing “Reopen Lead” button. Clicking button opens confirmation modal asking for reopening override reason.
Traceability: STORY-2.4.1 AC-4
TEST-EP2-LEADS-027 (Positive):

Description: Saved Views filters implementation
Input: Click Saved Views component, select “My Hot Leads”.
Expected Output: Filters list dynamically applying priority = "Hot" parameter; table data reloads.
Traceability: STORY-2.2.1
TEST-EP2-LEADS-028 (Positive):

Description: Lead List column sorts toggle indicators
Input: Click column headers.
Expected Output: Chevrons point up/down dynamically on clicked header. Sort query updates.
Traceability: STORY-2.2.1
TEST-EP2-LEADS-029 (UI/UX):

Description: Error toast popups auto-dismiss
Input: Trigger validation error toast by submitting faulty form.
Expected Output: Error toast appears at top right corner, and automatically dismisses after 5000ms duration.
Traceability: STORY-2.1.1
TEST-EP2-LEADS-030 (UI/UX):

Description: Numeric/Currency mask on Deal Value input
Input: Select “Won”, focus on Deal Value input, type alphabetical characters (e.g. “abc”).
Expected Output: Input ignores letters, accepting only decimal numbers. It formatted as currency (e.g. $ 15,000.00) on blur.
Traceability: STORY-2.4.1
vishnu
  11:41 AM
lst frontend
11:41
frontend.md
 

frontend.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.1.1 Only)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to create a new lead capturing company, contact, source, and business category so that potential customers are tracked and segmented from day one. Tech Stack: React (Vite) / TailwindCSS Total Test Cases: 12

📋 Table of Contents
Form Layout & Dynamic Feeds
Field Validations & Input Formatting
Real-time Duplicate Lookup Dialogs
Submission & Redirection Logic
1. Form Layout & Dynamic Feeds
TEST-EP2-LEADS-001 (Positive):

Description: Verify Lead Entry Form inputs render correctly with sections
Input: Open Lead Entry Form page.
Expected Output: Sections (Company Info, Contact Info, Lead Info) are clearly demarcated. Inputs present: Company Name, Contact Person, Mobile Number, Email, Website, City, Lead Source, Business Category, Business Sub-Category, Service Interested, Priority, Estimated Value. Mandatory fields marked with red asterisks (*).
Traceability: STORY-2.1.1, TASK-2.1.1-01
TEST-EP2-LEADS-002 (Positive):

Description: Verify “Lead Source” dropdown options load dynamically from backend
Input: User navigates to Lead Entry Form. React lifecycle triggers GET /admin/lead-sources.
Expected Output: Lead Source dropdown options match the list returned by the API (e.g. “Website”, “Referral”). Loading skeletons are shown until API resolves successfully.
Traceability: STORY-2.1.1, TASK-2.1.1-05
TEST-EP2-LEADS-003 (Positive):

Description: Verify “Business Category” dropdown options load dynamically
Input: Navigate to Lead Entry Form. UI triggers GET /admin/business-categories.
Expected Output: Business Category dropdown is populated with active categories fetched from backend (e.g. “IT Services”, “Retail”).
Traceability: STORY-2.1.1, TASK-2.1.1-06
TEST-EP2-LEADS-004 (Positive):

Description: Business Category and Sub-Category cascading dropdown interaction
Input: Select “IT Services” in Business Category dropdown. UI triggers GET /admin/business-categories/:categoryId/subcategories.
Expected Output: Sub-Category dropdown is enabled and populated with sub-categories belonging to “IT Services” (e.g. “Web Development”, “Mobile Apps”). Change Category to “Retail”; verify Sub-Category options immediately refresh to Retail-specific children, clearing previous selection.
Traceability: STORY-2.1.1, TASK-2.1.1-06
TEST-EP2-LEADS-005 (Positive):

Description: Verify “Services Interested” multi-select checklist loads options dynamically
Input: Open Lead Entry Form. React triggers GET /admin/services.
Expected Output: The multi-select checkbox group displays all active services (e.g. “App Development”, “SEO Optimization”) retrieved from database.
Traceability: STORY-2.1.1, TASK-2.1.1-07
TEST-EP2-LEADS-006 (Positive):

Description: Verify “Priority” selector options are present
Input: Open Lead Entry Form.
Expected Output: Radio group or select dropdown renders containing options: “Hot”, “Warm”, and “Cold”.
Traceability: STORY-2.1.1, TASK-2.1.1-08
2. Field Validations & Input Formatting
TEST-EP2-LEADS-007 (Negative):

Description: UI form submission with empty mandatory fields
Input: Click “Save” on empty Lead Entry Form.
Expected Output: Form submission is blocked. Input borders for Company Name, Contact Person, Mobile, Lead Source, Business Category, Service Interested, and Priority turn red. Inline error text appears under each: “[Field Name] is required.” Focus moves to the first invalid field.
Traceability: STORY-2.1.1, TASK-2.1.1-03
TEST-EP2-LEADS-008 (Negative):

Description: Mobile Number field format input validation
Input: Type non-numeric characters (e.g. “98765A3210”) or string of length 8 in Mobile input, then click Save or blur input.
Expected Output: Inline warning displayed: “Mobile Number must be exactly 10 digits.” System prevents character insertion if regex input mask is implemented, or marks input invalid.
Traceability: STORY-2.1.1, TASK-2.1.1-03, TASK-2.1.1-09
3. Real-time Duplicate Lookup Dialogs
TEST-EP2-LEADS-009 (Positive):

Description: Real-time Email check triggers warning on blur
Input: Type “existing@test.com” into the Email field, then click outside (blur). UI fires GET /marketing/leads/check-email?email=existing@test.com.
Expected Output: Warning text appears below Email input: “Warning: A lead with this email already exists. [View Lead]”. Border turns orange.
Traceability: STORY-2.1.1, TASK-2.1.1-09
TEST-EP2-LEADS-010 (Positive):

Description: Real-time Mobile check triggers duplicate modal dialog on blur
Input: Type “9876543210” (existing mobile) into Mobile input, then blur. UI fires GET /marketing/leads/check-mobile?mobile=9876543210.
Expected Output: Non-blocking modal alert appears: “A lead with this mobile number already exists (LD-2026-00001) — Continue / View Existing”.
Traceability: STORY-2.1.1, TASK-2.1.1-09
TEST-EP2-LEADS-011 (Positive):

Description: Interactive Modal redirect options “Continue” and “View Existing”
Input:
(a) Click “Continue”: Warning is dismissed, user can proceed to save.
(b) Click “View Existing”: Modal closes. Lead creation cancelled. User is redirected to /leads/LD-2026-00001 details view (which fetches data using GET /marketing/leads/:id).
Expected Output: User is redirected to /leads/LD-2026-00001 or warned before saving new record.
Traceability: STORY-2.1.1, TASK-2.1.1-09
4. Submission & Redirection Logic
TEST-EP2-LEADS-012 (Positive):
Description: Submit valid Lead Entry Form
Input: Fill in all mandatory fields, click “Save”. UI fires POST /marketing/leads.
Expected Output: Form submit button shows a loading spinner. Upon success, user is redirected to /leads/e4c18495-e224-5b11-b652-c9559fc9c902 (which loads details from GET /marketing/leads/:id and history timeline logs from GET /marketing/leads/:id/lead-history). A success toast “Lead created successfully” is shown.
Traceability: STORY-2.1.1, TASK-2.1.1-03, TASK-2.1.1-10, TASK-2.1.1-11, TASK-2.1.1-12
vishnu
  12:21 PM
APICovers1POST /marketing/leadsCreate Lead, Validation, Lead ID, Default Status, Default Stage, Assigned To, Lead History2GET /marketing/leads/check-mobileDuplicate Mobile Check3GET /marketing/leads/check-emailDuplicate Email Check4GET /admin/lead-sourcesLead Source Dropdown5GET /admin/business-categoriesBusiness Category Dropdown6GET /admin/business-categories/:categoryId/subcategoriesCascading Sub-Category Dropdown7GET /admin/servicesService Interested Multi-select8GET /marketing/leads/:idView Created Lead9GET /marketing/leads/:id/lead-historyLead History Timeline
Abirami K
  3:29 PM
resource
3:29
source
vishnu
  4:38 PM
frontend.md
 

frontend.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.1.1 Only)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to create a new lead capturing company, contact, source, and business category so that potential customers are tracked and segmented from day one. Tech Stack: React (Vite) / TailwindCSS Total Test Cases: 12

📋 Table of Contents
Form Layout & Dynamic Feeds
Field Validations & Input Formatting
Real-time Duplicate Lookup Dialogs
Submission & Redirection Logic
1. Form Layout & Dynamic Feeds
TEST-EP2-LEADS-001 (Positive):

Description: Verify Lead Entry Form inputs render correctly with sections
Input: Open Lead Entry Form page.
Expected Output: Sections (Company Info, Contact Info, Lead Info) are clearly demarcated. Inputs present: Company Name, Contact Person, Mobile Number, Email, Website, City, Lead Source, Business Category, Business Sub-Category, Service Interested, Priority, Estimated Value. Mandatory fields marked with red asterisks (*).
Traceability: STORY-2.1.1, TASK-2.1.1-01
TEST-EP2-LEADS-002 (Positive):

Description: Verify “Lead Source” dropdown options load dynamically from backend
Input: User navigates to Lead Entry Form. React lifecycle triggers GET /marketing/lead-sources.
Expected Output: Lead Source dropdown options match the list returned by the API (e.g. “Website”, “Referral”). Loading skeletons are shown until API resolves successfully.
Traceability: STORY-2.1.1, TASK-2.1.1-05
TEST-EP2-LEADS-003 (Positive):

Description: Verify “Business Category” dropdown options load dynamically
Input: Navigate to Lead Entry Form. UI triggers GET /marketing/business-categories.
Expected Output: Business Category dropdown is populated with active categories fetched from backend (e.g. “IT Services”, “Retail”).
Traceability: STORY-2.1.1, TASK-2.1.1-06
TEST-EP2-LEADS-004 (Positive):

Description: Business Category and Sub-Category cascading dropdown interaction
Input: Select “IT Services” in Business Category dropdown. UI triggers GET /marketing/business-categories/:categoryId/subcategories.
Expected Output: Sub-Category dropdown is enabled and populated with sub-categories belonging to “IT Services” (e.g. “Web Development”, “Mobile Apps”). Change Category to “Retail”; verify Sub-Category options immediately refresh to Retail-specific children, clearing previous selection.
Traceability: STORY-2.1.1, TASK-2.1.1-06
TEST-EP2-LEADS-005 (Positive):

Description: Verify “Services Interested” multi-select checklist loads options dynamically
Input: Open Lead Entry Form. React triggers GET /marketing/services.
Expected Output: The multi-select checkbox group displays all active services (e.g. “App Development”, “SEO Optimization”) retrieved from database.
Traceability: STORY-2.1.1, TASK-2.1.1-07
TEST-EP2-LEADS-006 (Positive):

Description: Verify “Priority” selector options are present
Input: Open Lead Entry Form.
Expected Output: Radio group or select dropdown renders containing options: “Hot”, “Warm”, and “Cold”.
Traceability: STORY-2.1.1, TASK-2.1.1-08
2. Field Validations & Input Formatting
TEST-EP2-LEADS-007 (Negative):

Description: UI form submission with empty mandatory fields
Input: Click “Save” on empty Lead Entry Form.
Expected Output: Form submission is blocked. Input borders for Company Name, Contact Person, Mobile, Lead Source, Business Category, Service Interested, and Priority turn red. Inline error text appears under each: “[Field Name] is required.” Focus moves to the first invalid field.
Traceability: STORY-2.1.1, TASK-2.1.1-03
TEST-EP2-LEADS-008 (Negative):

Description: Mobile Number field format input validation
Input: Type non-numeric characters (e.g. “98765A3210”) or string of length 8 in Mobile input, then click Save or blur input.
Expected Output: Inline warning displayed: “Mobile Number must be exactly 10 digits.” System prevents character insertion if regex input mask is implemented, or marks input invalid.
Traceability: STORY-2.1.1, TASK-2.1.1-03, TASK-2.1.1-09
3. Real-time Duplicate Lookup Dialogs
TEST-EP2-LEADS-009 (Positive):

Description: Real-time Email check triggers warning on blur
Input: Type “existing@test.com” into the Email field, then click outside (blur). UI fires GET /marketing/leads/check-email?email=existing@test.com.
Expected Output: Warning text appears below Email input: “Warning: A lead with this email already exists. [View Lead]”. Border turns orange.
Traceability: STORY-2.1.1, TASK-2.1.1-09
TEST-EP2-LEADS-010 (Positive):

Description: Real-time Mobile check triggers duplicate modal dialog on blur
Input: Type “9876543210” (existing mobile) into Mobile input, then blur. UI fires GET /marketing/leads/check-mobile?mobile=9876543210.
Expected Output: Non-blocking modal alert appears: “A lead with this mobile number already exists (LD-2026-00001) — Continue / View Existing”.
Traceability: STORY-2.1.1, TASK-2.1.1-09
TEST-EP2-LEADS-011 (Positive):

Description: Interactive Modal redirect options “Continue” and “View Existing”
Input:
(a) Click “Continue”: Warning is dismissed, user can proceed to save.
(b) Click “View Existing”: Modal closes. Lead creation cancelled. User is redirected to /leads/LD-2026-00001 details view (which fetches data using GET /marketing/leads/:id).
Expected Output: User is redirected to /leads/LD-2026-00001 or warned before saving new record.
Traceability: STORY-2.1.1, TASK-2.1.1-09
4. Submission & Redirection Logic
TEST-EP2-LEADS-012 (Positive):
Description: Submit valid Lead Entry Form
Input: Fill in all mandatory fields, click “Save”. UI fires POST /marketing/leads.
Expected Output: Form submit button shows a loading spinner. Upon success, user is redirected to /leads/e4c18495-e224-5b11-b652-c9559fc9c902 (which loads details from GET /marketing/leads/:id and history timeline logs from GET /marketing/leads/:id/lead-history). A success toast “Lead created successfully” is shown.
Traceability: STORY-2.1.1, TASK-2.1.1-03, TASK-2.1.1-10, TASK-2.1.1-11, TASK-2.1.1-12
vishnu
  9:40 AM
Zip
 

frontend-tests.zip
Zip
Abirami K
  11:19 AM
Excel Spreadsheet
 
vishnu
  12:01 PM
frontend-story-2.2.1.md
 

frontend-story-2.2.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.2.1: Saved Views & Bulk Operations)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to save filter/view configurations and perform bulk operations (select, assign, export) on leads so that I can efficiently manage large lead volumes. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 28

📋 Table of Contents
Saved Views — UI & Interaction
Saved Views — Create & Edit Flow
Saved Views — Delete Flow
Bulk Select — Checkbox & Selection UI
Bulk Assign — Modal & Submission
Bulk Export — Modal & Download
Role-Based Access — Admin vs ME
1. Saved Views — UI & Interaction
test-ep-2.2.1-101 (Positive):

Description: Saved Views panel renders correctly on Lead List page for Admin
Input: Navigate to /admin/leads as an Admin user. Mock GET /admin/leads/saved-views returns 2 views.
Expected Output: Saved Views sidebar or dropdown panel is visible. Two saved views are listed showing their names (e.g. “High Priority Leads”, “Today Follow-up”). Each row displays an edit (pencil) and delete (trash) icon. A “Save Current View” or “Create View” button is present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-102 (Positive):

Description: Empty state when no saved views exist
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns empty array [].
Expected Output: Empty state message displayed: “No saved views yet. Create your first view.” A prominent “Create View” call-to-action button is shown.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-103 (Positive):

Description: Apply a saved view populates filters and refreshes lead list
Input: Admin clicks on a saved view named “High Priority Leads” that has filters {"status":"Open","priority":"High"}. Mock GET /admin/leads/saved-views/{id} or read from local state.
Expected Output: Filter controls are updated: Status dropdown shows “Open”, Priority dropdown shows “High”. Lead list automatically refreshes with the applied filters. The saved view row is visually highlighted as “active”.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-104 (Positive):

Description: Loading skeleton shown while saved views are being fetched
Input: Navigate to /admin/leads. API response is delayed by 500ms.
Expected Output: A loading skeleton or spinner is displayed in the saved views panel until the API resolves. After resolution, skeletons are replaced with actual view names.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-105 (Negative):

Description: API failure when fetching saved views
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns a 500 error.
Expected Output: Error state displayed: “Failed to load saved views. [Retry]”. Clicking “Retry” triggers the API call again.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-106 (Edge):

Description: Long view name truncation
Input: A saved view exists with a 100-character name. Mock the API response with this long name.
Expected Output: The name is visually truncated with an ellipsis (...) at a reasonable width. Full name is visible on hover (title attribute or tooltip).
Traceability: STORY-2.2.1, C1-44
2. Saved Views — Create & Edit Flow
test-ep-2.2.1-107 (Positive):

Description: Open “Create Saved View” modal
Input: Admin clicks “Save Current View” or “Create View” button. Current filter state: Status=Open, Priority=High, Stage=Contacted.
Expected Output: Modal dialog opens with title “Save Current View”. A text input labeled “View Name” is present (pre-filled with suggested name or empty). A read-only summary of current filters is displayed. “Save” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-108 (Positive):

Description: Create saved view with current filters
Input: Admin enters “High Priority Leads” in the name field, clicks “Save”. Mock POST /admin/leads/saved-views returns 201 with the created view object.
Expected Output: Modal closes. Success toast: “View ‘High Priority Leads’ saved successfully”. The new view appears in the saved views list. Lead list filter state is preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-109 (Positive):

Description: Open “Edit” modal for existing saved view
Input: Admin clicks the edit (pencil) icon on “High Priority Leads” view. Mock the view data with existing name and filters.
Expected Output: Modal opens titled “Edit View”. Name input is pre-filled with “High Priority Leads”. Filters section shows the existing filter configuration. “Update” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-110 (Positive):

Description: Update saved view name via edit modal
Input: Admin changes name to “Hot Priority Leads”, clicks “Update”. Mock PUT /admin/leads/saved-views/{id} returns 200.
Expected Output: Modal closes. Success toast: “View updated successfully”. Name in the saved views list reflects the new name.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-111 (Negative):

Description: Create view with empty name — inline validation
Input: Admin clicks “Save” with an empty name field in the create modal.
Expected Output: Inline validation error shown: “View name is required”. Input border turns red. No API call is made. Modal remains open.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-112 (Negative):

Description: Create view with duplicate name — API error handling
Input: Admin enters an existing view name, clicks “Save”. Mock POST /admin/leads/saved-views returns 409 Conflict with {"error":"A saved view with this name already exists"}.
Expected Output: Inline error displayed below name input: “A saved view with this name already exists”. Modal stays open. User can correct the name and retry.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-113 (Negative):

Description: Network failure during save
Input: Admin fills in name, clicks “Save”. Mock network failure (fetch rejects).
Expected Output: Error toast: “Failed to save view. Please try again.” Modal remains open with the entered name preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-114 (Edge):

Description: Cancel create/edit modal
Input: Admin opens create modal, enters a name, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Filter/lead list state is unchanged.
Traceability: STORY-2.2.1, C1-44
3. Saved Views — Delete Flow
test-ep-2.2.1-115 (Positive):

Description: Delete saved view with confirmation
Input: Admin clicks delete (trash) icon on “Today Follow-up” view. Confirmation modal appears with “Are you sure you want to delete ‘Today Follow-up’?” and “Delete” / “Cancel” buttons. Admin clicks “Delete”. Mock DELETE /admin/leads/saved-views/{id} returns 200.
Expected Output: Confirmation modal closes. Success toast: “View ‘Today Follow-up’ deleted”. View is removed from the saved views list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-116 (Negative):

Description: Cancel delete operation
Input: Admin clicks delete icon, confirmation modal opens. Admin clicks “Cancel”.
Expected Output: Modal closes. No API call is made. View remains in the list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-117 (Negative):

Description: Delete API failure
Input: Admin confirms delete. Mock DELETE /admin/leads/saved-views/{id} returns 500.
Expected Output: Error toast: “Failed to delete view. Please try again.” View remains in the list (optimistic removal is rolled back).
Traceability: STORY-2.2.1, C1-44
4. Bulk Select — Checkbox & Selection UI
test-ep-2.2.1-118 (Positive):

Description: Select all leads via header checkbox
Input: Lead list displays 10 leads. Admin clicks the checkbox in the table header row.
Expected Output: All 10 visible leads are checked. A floating action bar appears at the bottom (or top) showing: “10 selected” with “Assign”, “Export”, and “Clear Selection” buttons. Mock POST /admin/leads/bulk-select is called with all 10 lead IDs.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-119 (Positive):

Description: Select individual leads
Input: Admin clicks checkboxes on rows 1, 3, and 5 individually.
Expected Output: Only rows 1, 3, and 5 are checked. Action bar shows “3 selected”. Header checkbox is in indeterminate (partial) state.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-120 (Positive):

Description: Deselect individual lead
Input: Admin selects all (10 selected), then unchecks row 5.
Expected Output: Row 5 unchecked. Counter shows “9 selected”. Header checkbox remains in indeterminate state. Action bar still visible.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-121 (Positive):

Description: Deselect all via “Clear Selection” button
Input: Admin selects 3 leads. Clicks “Clear Selection” in the action bar.
Expected Output: All checkboxes unchecked. Counter resets to 0. Action bar disappears/hides.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-122 (Positive):

Description: Deselect all via header checkbox when all selected
Input: All rows selected (header checkbox checked). Admin clicks header checkbox again.
Expected Output: All rows unchecked. Action bar disappears. Header checkbox unchecked.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-123 (Positive):

Description: Selection persists across pagination (client-side)
Input: Select 3 leads on page 1. Navigate to page 2. Navigate back to page 1.
Expected Output: The 3 leads on page 1 remain selected. Selection state is maintained in local state/context across page changes.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-124 (Edge):

Description: No leads match filter — select-all does nothing
Input: Apply a filter that returns 0 results.
Expected Output: Header checkbox is disabled or hidden. No rows to select. Action bar is not rendered.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-125 (Edge):

Description: Action bar hidden by default (no selection)
Input: Navigate to Lead List page without selecting any leads.
Expected Output: Action bar is not visible. Only row checkboxes and header checkbox are present.
Traceability: STORY-2.2.1, C1-45
5. Bulk Assign — Modal & Submission
test-ep-2.2.1-126 (Positive):

Description: Open bulk assign modal with selected leads
Input: Admin selects 2 leads, clicks “Assign” in the action bar. Mock GET /admin/users?role=Marketing%20Executive returns a list of active MEs.
Expected Output: Modal opens with title “Assign 2 Leads”. A user dropdown is populated with active Marketing Executives. An optional “Reason” text area is present. “Assign” and “Cancel” buttons are present. Summary text: “You are about to reassign 2 leads.”
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-127 (Positive):

Description: Complete bulk assign successfully
Input: Admin selects a user from dropdown, optionally enters a reason, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to John Doe”. Lead list refreshes. Action bar disappears. All selections cleared.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-128 (Negative):

Description: Submit assign with no user selected
Input: Admin opens assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation error: “Please select a user”. Modal does not close. No API call is made.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-129 (Negative):

Description: Assign API error handling
Input: Admin fills in all fields, clicks “Assign”. Mock `POST /admin/leads/bulk-a…
vishnu
  12:11 PM
frontend-story-2.2.1.md
 

frontend-story-2.2.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.2.1: Saved Views & Bulk Operations)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to save filter/view configurations and perform bulk operations (select, assign, export) on leads so that I can efficiently manage large lead volumes. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Saved Views — UI & Interaction
Saved Views — Create & Edit Flow
Saved Views — Delete Flow
Bulk Select — Checkbox & Selection UI
Bulk Assign — Modal & Submission
Bulk Export — Modal & Download
Lead List — Admin View (GET /admin/leads)
Role-Based Access — Admin vs ME
1. Saved Views — UI & Interaction
test-ep-2.2.1-001 (Positive):

Description: Saved Views panel renders correctly on Lead List page for Admin
Input: Navigate to /admin/leads as an Admin user. Mock GET /admin/leads/saved-views returns 2 views.
Expected Output: Saved Views sidebar or dropdown panel is visible. Two saved views are listed showing their names (e.g. “High Priority Leads”, “Today Follow-up”). Each row displays an edit (pencil) and delete (trash) icon. A “Save Current View” or “Create View” button is present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-002 (Positive):

Description: Empty state when no saved views exist
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns empty array [].
Expected Output: Empty state message displayed: “No saved views yet. Create your first view.” A prominent “Create View” call-to-action button is shown.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-003 (Positive):

Description: Apply a saved view populates filters and refreshes lead list
Input: Admin clicks on a saved view named “High Priority Leads” that has filters {"status":"Open","priority":"High"}. Mock GET /admin/leads/saved-views/{id} or read from local state.
Expected Output: Filter controls are updated: Status dropdown shows “Open”, Priority dropdown shows “High”. Lead list automatically refreshes with the applied filters. The saved view row is visually highlighted as “active”.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-004 (Positive):

Description: Loading skeleton shown while saved views are being fetched
Input: Navigate to /admin/leads. API response is delayed by 500ms.
Expected Output: A loading skeleton or spinner is displayed in the saved views panel until the API resolves. After resolution, skeletons are replaced with actual view names.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-005 (Negative):

Description: API failure when fetching saved views
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns a 500 error.
Expected Output: Error state displayed: “Failed to load saved views. [Retry]”. Clicking “Retry” triggers the API call again.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-006 (Edge):

Description: Long view name truncation
Input: A saved view exists with a 100-character name. Mock the API response with this long name.
Expected Output: The name is visually truncated with an ellipsis (...) at a reasonable width. Full name is visible on hover (title attribute or tooltip).
Traceability: STORY-2.2.1, C1-44
2. Saved Views — Create & Edit Flow
test-ep-2.2.1-007 (Positive):

Description: Open “Create Saved View” modal
Input: Admin clicks “Save Current View” or “Create View” button. Current filter state: Status=Open, Priority=High, Stage=Contacted.
Expected Output: Modal dialog opens with title “Save Current View”. A text input labeled “View Name” is present (pre-filled with suggested name or empty). A read-only summary of current filters is displayed. “Save” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-008 (Positive):

Description: Create saved view with current filters
Input: Admin enters “High Priority Leads” in the name field, clicks “Save”. Mock POST /admin/leads/saved-views returns 201 with the created view object.
Expected Output: Modal closes. Success toast: “View ‘High Priority Leads’ saved successfully”. The new view appears in the saved views list. Lead list filter state is preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-009 (Positive):

Description: Open “Edit” modal for existing saved view
Input: Admin clicks the edit (pencil) icon on “High Priority Leads” view. Mock the view data with existing name and filters.
Expected Output: Modal opens titled “Edit View”. Name input is pre-filled with “High Priority Leads”. Filters section shows the existing filter configuration. “Update” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-010 (Positive):

Description: Update saved view name via edit modal
Input: Admin changes name to “Hot Priority Leads”, clicks “Update”. Mock PUT /admin/leads/saved-views/{id} returns 200.
Expected Output: Modal closes. Success toast: “View updated successfully”. Name in the saved views list reflects the new name.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-011 (Negative):

Description: Create view with empty name — inline validation
Input: Admin clicks “Save” with an empty name field in the create modal.
Expected Output: Inline validation error shown: “View name is required”. Input border turns red. No API call is made. Modal remains open.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-012 (Negative):

Description: Create view with duplicate name — API error handling
Input: Admin enters an existing view name, clicks “Save”. Mock POST /admin/leads/saved-views returns 409 Conflict with {"error":"A saved view with this name already exists"}.
Expected Output: Inline error displayed below name input: “A saved view with this name already exists”. Modal stays open. User can correct the name and retry.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-013 (Negative):

Description: Network failure during save
Input: Admin fills in name, clicks “Save”. Mock network failure (fetch rejects).
Expected Output: Error toast: “Failed to save view. Please try again.” Modal remains open with the entered name preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-014 (Edge):

Description: Cancel create/edit modal
Input: Admin opens create modal, enters a name, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Filter/lead list state is unchanged.
Traceability: STORY-2.2.1, C1-44
3. Saved Views — Delete Flow
test-ep-2.2.1-015 (Positive):

Description: Delete saved view with confirmation
Input: Admin clicks delete (trash) icon on “Today Follow-up” view. Confirmation modal appears with “Are you sure you want to delete ‘Today Follow-up’?” and “Delete” / “Cancel” buttons. Admin clicks “Delete”. Mock DELETE /admin/leads/saved-views/{id} returns 200.
Expected Output: Confirmation modal closes. Success toast: “View ‘Today Follow-up’ deleted”. View is removed from the saved views list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-016 (Negative):

Description: Cancel delete operation
Input: Admin clicks delete icon, confirmation modal opens. Admin clicks “Cancel”.
Expected Output: Modal closes. No API call is made. View remains in the list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-017 (Negative):

Description: Delete API failure
Input: Admin confirms delete. Mock DELETE /admin/leads/saved-views/{id} returns 500.
Expected Output: Error toast: “Failed to delete view. Please try again.” View remains in the list (optimistic removal is rolled back).
Traceability: STORY-2.2.1, C1-44
4. Bulk Select — Checkbox & Selection UI
test-ep-2.2.1-018 (Positive):

Description: Select all leads via header checkbox
Input: Lead list displays 10 leads. Admin clicks the checkbox in the table header row.
Expected Output: All 10 visible leads are checked. A floating action bar appears at the bottom (or top) showing: “10 selected” with “Assign”, “Export”, and “Clear Selection” buttons. Mock POST /admin/leads/bulk-select is called with all 10 lead IDs.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-019 (Positive):

Description: Select individual leads
Input: Admin clicks checkboxes on rows 1, 3, and 5 individually.
Expected Output: Only rows 1, 3, and 5 are checked. Action bar shows “3 selected”. Header checkbox is in indeterminate (partial) state.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-020 (Positive):

Description: Deselect individual lead
Input: Admin selects all (10 selected), then unchecks row 5.
Expected Output: Row 5 unchecked. Counter shows “9 selected”. Header checkbox remains in indeterminate state. Action bar still visible.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-021 (Positive):

Description: Deselect all via “Clear Selection” button
Input: Admin selects 3 leads. Clicks “Clear Selection” in the action bar.
Expected Output: All checkboxes unchecked. Counter resets to 0. Action bar disappears/hides.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-022 (Positive):

Description: Deselect all via header checkbox when all selected
Input: All rows selected (header checkbox checked). Admin clicks header checkbox again.
Expected Output: All rows unchecked. Action bar disappears. Header checkbox unchecked.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-023 (Positive):

Description: Selection persists across pagination (client-side)
Input: Select 3 leads on page 1. Navigate to page 2. Navigate back to page 1.
Expected Output: The 3 leads on page 1 remain selected. Selection state is maintained in local state/context across page changes.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-024 (Edge):

Description: No leads match filter — select-all does nothing
Input: Apply a filter that returns 0 results.
Expected Output: Header checkbox is disabled or hidden. No rows to select. Action bar is not rendered.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-025 (Edge):

Description: Action bar hidden by default (no selection)
Input: Navigate to Lead List page without selecting any leads.
Expected Output: Action bar is not visible. Only row checkboxes and header checkbox are present.
Traceability: STORY-2.2.1, C1-45
5. Bulk Assign — Modal & Submission
test-ep-2.2.1-026 (Positive):

Description: Open bulk assign modal with selected leads
Input: Admin selects 2 leads, clicks “Assign” in the action bar. Mock GET /admin/users?role=Marketing%20Executive returns a list of active MEs.
Expected Output: Modal opens with title “Assign 2 Leads”. A user dropdown is populated with active Marketing Executives. An optional “Reason” text area is present. “Assign” and “Cancel” buttons are present. Summary text: “You are about to reassign 2 leads.”
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-027 (Positive):

Description: Complete bulk assign successfully
Input: Admin selects a user from dropdown, optionally enters a reason, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to John Doe”. Lead list refreshes. Action bar disappears. All selections cleared.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-028 (Negative):

Description: Submit assign with no user selected
Input: Admin opens assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation error: “Please select a user”. Modal does not close. No API call is made.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-029 (Negative):

Description: Assign API error handling…



vishnu
  2:11 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 35

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is …



vishnu
  2:38 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
**test-ep…




vishnu
  4:51 PM
frontend-story-2.4.1.md
 

frontend-story-2.4.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.4.1: Lead Stage Management)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As a Marketing Executive, I want to update a lead’s stage so that pipeline progress is accurately reflected. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 41

📋 Table of Contents
Stage Selector — UI & Interaction
Stage Transition — Validation & Flow
Lost Reason — Mandatory Capture
Won Closure — Deal Value & Closure Date Capture
Lead History — Timeline Display
Won/Lost Lock — Closed Lead Handling & Admin Reopen
1. Stage Selector — UI & Interaction
Purpose: The Lead Detail page displays a stage selector showing only valid next stages based on the current stage.

test-ep-2.4.1-001 (Positive):

Description: Stage selector renders correct options for New Lead stage
Input: Navigate to /app/leads/{id} as ME. Lead stage is "New Lead". Mock API returns lead data.
Expected Output: Stage selector dropdown shows the current stage "New Lead" as selected/displayed. Clicking the dropdown reveals available options: Contacted, Hold, Lost. Options Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Won are NOT listed. The selector is enabled (interactive).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-002 (Positive):

Description: Stage selector options update dynamically as stage progresses
Input: Navigate to lead at "Contacted" stage. Open stage selector.
Expected Output: Available options: Meeting Scheduled, Hold, Lost. Options for earlier stages (New Lead) are NOT listed. Won is NOT listed (must use close flow from Negotiation).
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-003 (Positive):

Description: Stage selector at Negotiation shows Lost and Won options (via close flow)
Input: Navigate to lead at "Negotiation" stage.
Expected Output: Stage selector shows Lost as a direct option (triggers Lost Reason modal). A separate “Close as Won” button or menu item triggers Won Closure modal. Or both Lost and Won are available as stage options with respective modals.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-004 (Positive):

Description: Stage selector is disabled for closed leads (Won/Lost) for ME
Input: Navigate to lead at "Won" stage as ME.
Expected Output: Stage selector is disabled (greyed out, non-interactive). A lock icon or closed badge is displayed. Text: “This lead is closed. Contact Admin to reopen.”
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-005 (Positive):

Description: Admin sees enabled stage selector even on closed leads
Input: Navigate to /admin/leads/{id} for a Won lead as Admin.
Expected Output: Stage selector is enabled for Admin. A “Reopen Lead” button is visible (not the standard stage dropdown). Admin can proceed with reopen flow.
Traceability: STORY-2.4.1, C1-54, C1-59
test-ep-2.4.1-006 (Positive):

Description: Loading skeleton shown while lead data loads
Input: Navigate to lead detail page. API response delayed by 500ms.
Expected Output: Stage selector area shows a skeleton or placeholder during loading. After API resolves, selector renders with correct options.
Traceability: STORY-2.4.1, C1-54
test-ep-2.4.1-007 (Negative):

Description: API error fetching lead data shows error state
Input: Navigate to lead detail page. Mock API returns 500.
Expected Output: Error state: “Failed to load lead data. [Retry]”. Stage selector is not rendered.
Traceability: STORY-2.4.1, C1-54
2. Stage Transition — Validation & Flow
Purpose: Selecting a valid stage triggers the PUT /marketing/leads/:id/status API. Invalid/skipped transitions show inline errors.

test-ep-2.4.1-008 (Positive):

Description: Selecting a valid stage triggers API call and updates UI
Input: ME selects "Contacted" from stage selector (lead at "New Lead"). Confirmation prompt or direct transition occurs. Mock PUT /marketing/leads/{id}/status returns 200.
Expected Output: Success toast: “Stage updated to Contacted”. Stage selector now shows "Contacted" as current stage. Available options update to reflect next valid stages from Contacted.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-009 (Positive):

Description: Progressing through full pipeline updates UI at each step
Input: ME transitions lead through: New Lead → Contacted → Meeting Scheduled → Requirement Gathering → Proposal Sent → Negotiation. Each step via stage selector.
Expected Output: Each transition succeeds with toast. Current stage updates. Options update dynamically per stage.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-010 (Negative):

Description: Selecting a skipped/illegal stage shows inline error
Input: ME at "New Lead" attempts to select "Meeting Scheduled" (not in allowed list for New Lead). The option is not available in the dropdown.
Expected Output: The invalid option is not rendered in the dropdown. ME cannot select it. No API call is made for non-existent options.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-011 (Negative):

Description: API 422 for illegal transition shows error toast
Input: ME bypasses frontend restrictions (e.g., via API console) and attempts illegal transition. Mock API returns 422.
Expected Output: Error toast: “Invalid stage transition. Allowed transitions from [current stage]: [list]”. Stage selector reverts to previous valid stage.
Traceability: STORY-2.4.1, C1-55
test-ep-2.4.1-012 (Negative):

Description: API network error during stage transition
Input: ME selects valid stage. Mock API returns 500.
Expected Output: Error toast: “Failed to update stage. Please try again.” Stage selector stays at current stage. User can retry.
Traceability: STORY-2.4.1, C1-54, C1-55
test-ep-2.4.1-013 (Edge):

Description: Select same stage (no-op) — no API call or toast
Input: ME clicks the currently selected stage "Contacted" again.
Expected Output: No API call is made. No toast. Stage selector remains unchanged.
Traceability: STORY-2.4.1, C1-54, C1-55
3. Lost Reason — Mandatory Capture
Purpose: When Stage = Lost is selected, a modal forces the user to pick a Lost Reason from a predefined enum before saving.

test-ep-2.4.1-014 (Positive):

Description: Lost Reason modal opens when Lost is selected
Input: ME selects "Lost" from stage selector (lead at any active stage).
Expected Output: A modal dialog opens with title “Close as Lost”. A required dropdown labeled “Lost Reason” is present with options: Budget, Competitor, Not Interested, No Response, Timing, Other. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-015 (Positive):

Description: Submit Lost with valid reason closes modal and updates lead
Input: ME selects "Budget" from Lost Reason dropdown, clicks “Confirm”. Mock POST /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Lost”. Stage selector now shows "Lost" as disabled (closed). Lead status shows “Lost” with the reason displayed.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-016 (Negative):

Description: Submit Lost without selecting a reason
Input: ME opens Lost modal, clicks “Confirm” without selecting a reason.
Expected Output: Inline validation: “Please select a lost reason.” Dropdown border turns red. No API call made. Modal remains open.
Traceability: STORY-2.4.1, C1-56
test-ep-2.4.1-017 (Negative):

Description: API error during Lost close
Input: ME selects reason, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open. User can retry or cancel.
Traceability: STORY-2.4.1, C1-54, C1-56
test-ep-2.4.1-018 (Edge):

Description: Cancel Lost modal
Input: ME opens Lost modal, clicks “Cancel” or presses Escape.
Expected Output: Modal closes. Stage selector reverts to previous stage. No API call made. Lead unchanged.
Traceability: STORY-2.4.1, C1-54, C1-56
4. Won Closure — Deal Value & Closure Date Capture
Purpose: When Stage = Won is selected, a modal forces entry of Final Deal Value and Closure Date before saving.

test-ep-2.4.1-019 (Positive):

Description: Won Closure modal opens when Won is triggered
Input: ME clicks “Close as Won” button/option (lead at "Negotiation").
Expected Output: A modal dialog opens with title “Close as Won”. Input fields: “Final Deal Value” (numeric input) and “Closure Date” (date picker). Both fields are marked as required. “Confirm” and “Cancel” buttons present.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-020 (Positive):

Description: Submit Won with valid values closes modal and updates lead
Input: ME enters 50000 in deal value, selects 2026-07-15 as closure date, clicks “Confirm”. Mock PUT /marketing/leads/{id}/close returns 200.
Expected Output: Modal closes. Success toast: “Lead closed as Won with deal value of $50,000”. Stage selector shows "Won" as disabled. Lead detail shows Won badge, deal value, and closure date.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-021 (Positive):

Description: Submit Won with zero deal value (free service)
Input: ME enters 0 as deal value, valid closure date, clicks “Confirm”.
Expected Output: HTTP 200 OK. Success toast shown.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-022 (Negative):

Description: Submit Won without deal value
Input: ME leaves deal value empty, enters valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Final deal value is required.” Input border turns red. No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-023 (Negative):

Description: Submit Won without closure date
Input: ME enters valid deal value, leaves closure date empty, clicks “Confirm”.
Expected Output: Inline validation: “Closure date is required.” No API call made.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-024 (Negative):

Description: Submit Won with negative deal value
Input: ME enters -1000 as deal value, valid closure date, clicks “Confirm”.
Expected Output: Inline validation: “Deal value cannot be negative.” Input border turns red.
Traceability: STORY-2.4.1, C1-57
test-ep-2.4.1-025 (Negative):

Description: API error during Won close
Input: ME enters valid values, clicks “Confirm”. Mock API returns 500.
Expected Output: Error toast: “Failed to close lead. Please try again.” Modal remains open.
Traceability: STORY-2.4.1, C1-54, C1-57
test-ep-2.4.1-026 (Edge):

Description: Cancel Won modal
Input: ME opens Won modal, enters values, clicks “Cancel”.
Expected Output: Modal closes. Stage selector reverts. No API call made.
Traceability: STORY-2.4.1, C1-54, C1-57
5. Lead History — Timeline Display
Purpose: The Lead Detail page displays a chronological timeline of all stage changes. Entries are read-only and immutable.

test-ep-2.4.1-027 (Positive):

Description: Timeline displays stage change events in chronological order
Input: Lead has history: New Lead → Contacted → Meeting Scheduled → Proposal Sent. Navigate to Lead Detail and scroll to Timeline section.
Expected Output: Timeline shows 3 stage change entries sorted newest first. Each entry displays: event type icon (stage change), Previous Stage → New Stage, Actor name, Timestamp (relative or absolute). The most recent transition is highlighted.
Traceability: STORY-2.4.1, C1-54, C1-58
test-ep-2.4.1-028 (Positive):

Description: Timeline includes close and reopen events with details
Input: Lead has transitioned: Contacted → Lost (Budget) → Reopened → Contacted → Won ($50k). …





Message vishnu







Shift + Enter to add a new line




EPIC-2: Lead Management — Frontend Test Cases (STORY-2.2.1: Saved Views & Bulk Operations)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to save filter/view configurations and perform bulk operations (select, assign, export) on leads so that I can efficiently manage large lead volumes. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Saved Views — UI & Interaction
Saved Views — Create & Edit Flow
Saved Views — Delete Flow
Bulk Select — Checkbox & Selection UI
Bulk Assign — Modal & Submission
Bulk Export — Modal & Download
Lead List — Admin View (GET /admin/leads)
Role-Based Access — Admin vs ME
1. Saved Views — UI & Interaction
test-ep-2.2.1-001 (Positive):

Description: Saved Views panel renders correctly on Lead List page for Admin
Input: Navigate to /admin/leads as an Admin user. Mock GET /admin/leads/saved-views returns 2 views.
Expected Output: Saved Views sidebar or dropdown panel is visible. Two saved views are listed showing their names (e.g. “High Priority Leads”, “Today Follow-up”). Each row displays an edit (pencil) and delete (trash) icon. A “Save Current View” or “Create View” button is present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-002 (Positive):

Description: Empty state when no saved views exist
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns empty array [].
Expected Output: Empty state message displayed: “No saved views yet. Create your first view.” A prominent “Create View” call-to-action button is shown.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-003 (Positive):

Description: Apply a saved view populates filters and refreshes lead list
Input: Admin clicks on a saved view named “High Priority Leads” that has filters {"status":"Open","priority":"High"}. Mock GET /admin/leads/saved-views/{id} or read from local state.
Expected Output: Filter controls are updated: Status dropdown shows “Open”, Priority dropdown shows “High”. Lead list automatically refreshes with the applied filters. The saved view row is visually highlighted as “active”.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-004 (Positive):

Description: Loading skeleton shown while saved views are being fetched
Input: Navigate to /admin/leads. API response is delayed by 500ms.
Expected Output: A loading skeleton or spinner is displayed in the saved views panel until the API resolves. After resolution, skeletons are replaced with actual view names.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-005 (Negative):

Description: API failure when fetching saved views
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns a 500 error.
Expected Output: Error state displayed: “Failed to load saved views. [Retry]”. Clicking “Retry” triggers the API call again.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-006 (Edge):

Description: Long view name truncation
Input: A saved view exists with a 100-character name. Mock the API response with this long name.
Expected Output: The name is visually truncated with an ellipsis (...) at a reasonable width. Full name is visible on hover (title attribute or tooltip).
Traceability: STORY-2.2.1, C1-44
2. Saved Views — Create & Edit Flow
test-ep-2.2.1-007 (Positive):

Description: Open “Create Saved View” modal
Input: Admin clicks “Save Current View” or “Create View” button. Current filter state: Status=Open, Priority=High, Stage=Contacted.
Expected Output: Modal dialog opens with title “Save Current View”. A text input labeled “View Name” is present (pre-filled with suggested name or empty). A read-only summary of current filters is displayed. “Save” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-008 (Positive):

Description: Create saved view with current filters
Input: Admin enters “High Priority Leads” in the name field, clicks “Save”. Mock POST /admin/leads/saved-views returns 201 with the created view object.
Expected Output: Modal closes. Success toast: “View ‘High Priority Leads’ saved successfully”. The new view appears in the saved views list. Lead list filter state is preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-009 (Positive):

Description: Open “Edit” modal for existing saved view
Input: Admin clicks the edit (pencil) icon on “High Priority Leads” view. Mock the view data with existing name and filters.
Expected Output: Modal opens titled “Edit View”. Name input is pre-filled with “High Priority Leads”. Filters section shows the existing filter configuration. “Update” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-010 (Positive):

Description: Update saved view name via edit modal
Input: Admin changes name to “Hot Priority Leads”, clicks “Update”. Mock PUT /admin/leads/saved-views/{id} returns 200.
Expected Output: Modal closes. Success toast: “View updated successfully”. Name in the saved views list reflects the new name.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-011 (Negative):

Description: Create view with empty name — inline validation
Input: Admin clicks “Save” with an empty name field in the create modal.
Expected Output: Inline validation error shown: “View name is required”. Input border turns red. No API call is made. Modal remains open.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-012 (Negative):

Description: Create view with duplicate name — API error handling
Input: Admin enters an existing view name, clicks “Save”. Mock POST /admin/leads/saved-views returns 409 Conflict with {"error":"A saved view with this name already exists"}.
Expected Output: Inline error displayed below name input: “A saved view with this name already exists”. Modal stays open. User can correct the name and retry.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-013 (Negative):

Description: Network failure during save
Input: Admin fills in name, clicks “Save”. Mock network failure (fetch rejects).
Expected Output: Error toast: “Failed to save view. Please try again.” Modal remains open with the entered name preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-014 (Edge):

Description: Cancel create/edit modal
Input: Admin opens create modal, enters a name, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Filter/lead list state is unchanged.
Traceability: STORY-2.2.1, C1-44
3. Saved Views — Delete Flow
test-ep-2.2.1-015 (Positive):

Description: Delete saved view with confirmation
Input: Admin clicks delete (trash) icon on “Today Follow-up” view. Confirmation modal appears with “Are you sure you want to delete ‘Today Follow-up’?” and “Delete” / “Cancel” buttons. Admin clicks “Delete”. Mock DELETE /admin/leads/saved-views/{id} returns 200.
Expected Output: Confirmation modal closes. Success toast: “View ‘Today Follow-up’ deleted”. View is removed from the saved views list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-016 (Negative):

Description: Cancel delete operation
Input: Admin clicks delete icon, confirmation modal opens. Admin clicks “Cancel”.
Expected Output: Modal closes. No API call is made. View remains in the list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-017 (Negative):

Description: Delete API failure
Input: Admin confirms delete. Mock DELETE /admin/leads/saved-views/{id} returns 500.
Expected Output: Error toast: “Failed to delete view. Please try again.” View remains in the list (optimistic removal is rolled back).
Traceability: STORY-2.2.1, C1-44
4. Bulk Select — Checkbox & Selection UI
test-ep-2.2.1-018 (Positive):

Description: Select all leads via header checkbox
Input: Lead list displays 10 leads. Admin clicks the checkbox in the table header row.
Expected Output: All 10 visible leads are checked. A floating action bar appears at the bottom (or top) showing: “10 selected” with “Assign”, “Export”, and “Clear Selection” buttons. Mock POST /admin/leads/bulk-select is called with all 10 lead IDs.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-019 (Positive):

Description: Select individual leads
Input: Admin clicks checkboxes on rows 1, 3, and 5 individually.
Expected Output: Only rows 1, 3, and 5 are checked. Action bar shows “3 selected”. Header checkbox is in indeterminate (partial) state.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-020 (Positive):

Description: Deselect individual lead
Input: Admin selects all (10 selected), then unchecks row 5.
Expected Output: Row 5 unchecked. Counter shows “9 selected”. Header checkbox remains in indeterminate state. Action bar still visible.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-021 (Positive):

Description: Deselect all via “Clear Selection” button
Input: Admin selects 3 leads. Clicks “Clear Selection” in the action bar.
Expected Output: All checkboxes unchecked. Counter resets to 0. Action bar disappears/hides.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-022 (Positive):

Description: Deselect all via header checkbox when all selected
Input: All rows selected (header checkbox checked). Admin clicks header checkbox again.
Expected Output: All rows unchecked. Action bar disappears. Header checkbox unchecked.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-023 (Positive):

Description: Selection persists across pagination (client-side)
Input: Select 3 leads on page 1. Navigate to page 2. Navigate back to page 1.
Expected Output: The 3 leads on page 1 remain selected. Selection state is maintained in local state/context across page changes.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-024 (Edge):

Description: No leads match filter — select-all does nothing
Input: Apply a filter that returns 0 results.
Expected Output: Header checkbox is disabled or hidden. No rows to select. Action bar is not rendered.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-025 (Edge):

Description: Action bar hidden by default (no selection)
Input: Navigate to Lead List page without selecting any leads.
Expected Output: Action bar is not visible. Only row checkboxes and header checkbox are present.
Traceability: STORY-2.2.1, C1-45
5. Bulk Assign — Modal & Submission
test-ep-2.2.1-026 (Positive):

Description: Open bulk assign modal with selected leads
Input: Admin selects 2 leads, clicks “Assign” in the action bar. Mock GET /admin/users?role=Marketing%20Executive returns a list of active MEs.
Expected Output: Modal opens with title “Assign 2 Leads”. A user dropdown is populated with active Marketing Executives. An optional “Reason” text area is present. “Assign” and “Cancel” buttons are present. Summary text: “You are about to reassign 2 leads.”
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-027 (Positive):

Description: Complete bulk assign successfully
Input: Admin selects a user from dropdown, optionally enters a reason, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to John Doe”. Lead list refreshes. Action bar disappears. All selections cleared.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-028 (Negative):

Description: Submit assign with no user selected
Input: Admin opens assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation error: “Please select a user”. Modal does not close. No API call is made.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-029 (Negative):

Description: Assign API error handling
Input: Admin fills in all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. User can retry or cancel.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-030 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens assign modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact. No API call made.
Traceability: STORY-2.2.1, C1-45
6. Bulk Export — Modal & Download
test-ep-2.2.1-031 (Positive):

Description: Open bulk export modal with selected leads
Input: Admin selects 2 leads, clicks “Export” in the action bar.
Expected Output: Modal opens with title “Export 2 Leads”. Radio buttons or toggle: “Excel (.xlsx)” (default selected) and “CSV (.csv)”. Summary: “2 leads will be exported”. “Export” and “Cancel” buttons present.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-032 (Positive):

Description: Complete export and trigger file download
Input: Admin selects “Excel (.xlsx)”, clicks “Export”. Mock POST /admin/leads/export returns 200 with {"download_url":"/exports/leads-2026-07-01.xlsx"}. Then fetch the download URL.
Expected Output: Modal closes. Success toast: “Export ready. Downloading…” File download is triggered (via anchor click or blob fetch). Action bar and selections cleared after export.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-033 (Positive):

Description: Export with CSV format
Input: Admin selects “CSV (.csv)”, clicks “Export”. Mock returns download_url for .csv file.
Expected Output: CSV file download is triggered. Success toast shown.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-034 (Negative):

Description: Export API error
Input: Admin clicks “Export”. Mock POST /admin/leads/export returns 500.
Expected Output: Error toast: “Export failed. Please try again.” Modal remains open.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-035 (Edge):

Description: Cancel export modal
Input: Admin opens export modal, clicks “Cancel”.
Expected Output: Modal closes. Selections intact. No API call made.
Traceability: STORY-2.2.1, C1-45
7. Lead List — Admin View (GET /admin/leads)
test-ep-2.2.1-036 (Positive):

Description: Admin lead list loads data from GET /admin/leads on mount
Input: Navigate to /admin/leads. Mock GET /admin/leads?page=1&limit=25 returns paginated response with 25 leads and pagination metadata.
Expected Output: Table renders with 25 rows. Columns displayed: Lead ID, Company, Contact Person, Mobile, Priority, Status, Stage, Estimated Value, Assigned To, Created At. Pagination controls show “Page 1 of N”.
Traceability: STORY-2.2.1, C1-39
test-ep-2.2.1-037 (Positive):

Description: Admin sees leads from all assigned users
Input: Navigate to /admin/leads. Mock response includes leads assigned to ME-A, ME-B, ME-C, and unassigned leads.
Expected Output: All leads rendered in the table regardless of assigned_to. “Assigned To” column shows the name of the assigned user or “Unassigned”.
Traceability: STORY-2.2.1, C1-40
test-ep-2.2.1-038 (Positive):

Description: Free-text search sends query to API
Input: Type “Supabase” in the search input field. Debounce timeout (300ms) elapses. Mock GET /admin/leads?search=Supabase&page=1&limit=25 returns filtered results.
Expected Output: API called with search=Supabase. Table refreshes with matching leads. Search input shows the typed text.
Traceability: STORY-2.2.1, C1-43
test-ep-2.2.1-039 (Positive):

Description: Filter dropdown changes trigger API call with filter params
Input: Admin selects Status=“Open” and Priority=“High” from filter dropdowns. Mock GET /admin/leads?status=Open&priority=High&page=1&limit=25 returns filtered data.
Expected Output: API called with filter query params. Table updates to show only matching leads. Filter dropdowns reflect the selected values.
Traceability: STORY-2.2.1, C1-42
test-ep-2.2.1-040 (Positive):

Description: Column sort toggles ascending/descending
Input: Admin clicks “Estimated Value” column header. Mock GET /admin/leads?sortBy=estimated_value&sortOrder=desc&page=1&limit=25 returns sorted data. Admin clicks again.
Expected Output: First click: sort indicator (arrow down) shown, API called with sortOrder=desc. Second click: sort indicator (arrow up), API called with sortOrder=asc.
Traceability: STORY-2.2.1, C1-41
test-ep-2.2.1-041 (Positive):

Description: Pagination controls work correctly
Input: Admin clicks “Next” button. Mock GET /admin/leads?page=2&limit=25 returns next page. Admin clicks page number “3”.
Expected Output: “Next” loads page 2 data. Page number click loads page 3. Current page indicator updates. “Previous” is disabled on page 1.
Traceability: STORY-2.2.1, C1-39
test-ep-2.2.1-042 (Positive):

Description: Loading skeleton shown while fetching leads
Input: Navigate to /admin/leads. API response delayed by 500ms.
Expected Output: Table shows skeleton rows or spinner during loading. After API resolves, skeletons replaced with actual data.
Traceability: STORY-2.2.1, C1-39
test-ep-2.2.1-043 (Edge):

Description: Empty state when no leads exist
Input: Navigate to /admin/leads. Mock GET /admin/leads returns totalCount: 0 with empty data array.
Expected Output: Table shows empty state message: “No leads found matching your criteria.” or “No leads in the system yet.” Pagination controls hidden.
Traceability: STORY-2.2.1, C1-39
test-ep-2.2.1-044 (Negative):

Description: API error fetching lead list
Input: Navigate to /admin/leads. Mock GET /admin/leads returns 500 error.
Expected Output: Error state displayed: “Failed to load leads. [Retry]”. Clicking “Retry” re-triggers the API call.
Traceability: STORY-2.2.1, C1-39
test-ep-2.2.1-045 (Edge):

Description: Combined search + filter + sort + pagination interaction
Input: Enter search text “Tech”, select Status=“Open”, sort by Created Date descending, navigate to page 2. Mock API called with all combined params.
Expected Output: All parameters persist together. URL reflects the current state (if query params are used). Changing one parameter resets page to 1.
Traceability: STORY-2.2.1, C1-39, C1-41, C1-42, C1-43
8. Role-Based Access — Admin vs ME
test-ep-2.2.1-046 (Negative):

Description: Saved Views panel is hidden for Marketing Executive
Input: Navigate to /marketing/leads as a Marketing Executive user.
Expected Output: Saved Views panel/button is not rendered. Bulk action bar is not rendered. Row checkboxes are not rendered.
Traceability: STORY-2.2.1, C1-44, C1-45
test-ep-2.2.1-047 (Negative):

Description: Bulk action buttons do not appear for ME even if URL manipulated
Input: ME navigates to /admin/leads directly via URL. Mock API returns 403 for all admin endpoints.
Expected Output: Page shows “Access Denied” or redirects to /marketing/leads. No bulk operations UI is rendered.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-048 (Negative):

Description: API 403 responses are gracefully handled in UI
Input: Admin role somehow loses permissions mid-session. A bulk operation returns 403.
Expected Output: Error toast: “You do not have permission to perform this action.” User is redirected or UI updates to disable admin features.
Traceability: STORY-2.2.1, C1-44, C1-45
End of Frontend Test Cases for STORY-2.2.1 — Total: 38 test cases (Sections 1–8)

