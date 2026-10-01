# EMS frontend component standards

Implemented September 30, 2026. Source of truth: `src/theme.ts`. These standards guide new work; token checks alone do not establish WCAG conformance.

## Tokens and layout

| Purpose                                       | Value                                                              |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Primary / focused controls                    | `#5B4BE1` / `#4638BE`                                              |
| Main / supporting text                        | `#1C2138` / `#5C6379`                                              |
| Canvas / cards                                | `#F5F6FA` / `#FFFFFF`                                              |
| Decorative separators / functional boundaries | `#ECEEF4` / `#767D94`                                              |
| Success / warning / error foreground          | `#137D45` / `#9A5B00` / `#C92A34`                                  |
| Body / secondary text / inputs                | 16px, line-height 1.5 / 14px, 1.45 / 16px                          |
| Page / section heading                        | 28px desktop, 24px below 600px / 18px                              |
| Spacing                                       | 4, 8, 12, 16, 24, 32px; 24px between sections; 16px between fields |
| Page horizontal padding                       | 16px mobile, 32px from 900px                                       |
| Buttons, icon buttons, nav items, toggles     | Minimum 44px height; icon buttons minimum 44px width               |
| Outlined inputs                               | Minimum 48px height                                                |
| Corner radius                                 | Cards 10px; inputs and buttons 8px; chips 6px                      |
| Button focus                                  | 3px outline, 3px offset; white outline in dark app bar             |

Use light semantic backgrounds for alerts with dark foreground text. Keep decorative separators distinct from control outlines. Respect reduced-motion preferences. Use `h2` typography for the one page `h1`, `h3` for section `h2`, and explicit `component="p"` for large numerical values. The theme maps `h6` to a paragraph to avoid using card labels as arbitrary headings.

## Navigation and responsive records

`AppLayout` provides a skip link, focusable main landmark, route-specific document title, and responsive drawer. The drawer trigger exposes its expanded state and controlled navigation. Preserve focus return when dismissing the drawer.

Below 600px, filters stack and action rows wrap. Use labeled mobile cards for attendance and pay records. Keep comparative management data in semantic tables within an `overflowX: auto` region with `tabIndex=0` and an accessible label. Do not duplicate interactive mobile and desktop records in the active accessibility tree. Test at 320, 375, 442, 768, and 1280px, plus zoom.

## Forms and confirmations

Use `FormDialog` with explicit `submitLabel`, `pendingLabel`, and `successMessage`. Include a named record summary for consequential actions. Example: title “Deactivate employee”, summary “Alex Worker · 000001”, submit “Deactivate employee”, pending “Deactivating…”. Use `submitColor="error"` for destructive actions. A cancellation confirmation may use `cancelLabel="Keep shift"` to distinguish dismissal from cancellation.

Keep the title and action footer visible while dialog content scrolls. Group long forms with `grouped` and field `section` values. Required sections precede the optional accordion; server errors in optional fields expand it. Preserve values on validation/server failure and lock submission while pending. Native constraints and `validate` provide early feedback; server validation remains authoritative.

Employee setup sections: Identity, Employment, Login access, Optional details. Employee number is informational, not a disabled input. Use “Hourly pay (CAD)” and distinguish workforce role from login-account role/status. `AccountPicker` searches the existing paged account endpoint, requests up to 20 matches, and fetches a selected account by ID. Never load all account pages to populate a selector.

## Date/time controls

Use field type `datetime` for shift instants and attendance corrections. `MountainDateTimeField` groups native date/time inputs under a Mountain Time legend, preserves seconds, and outputs an offset-qualified value. Spring-forward gaps show a validation error; repeated fall-back hours require choosing first/second occurrence. Convert with existing `parseTime` before sending an instant to the API. Use native `time` for category defaults and recurring availability; those represent local wall times, not instants.

Show duration and overnight context before shift submission. Validate positive duration and current 24-hour limit. Keep backend conflict/version checks and attendance correction reasons intact.

## Query and mutation states

`QueryState` distinguishes initial loading, retryable error, and content. Show “Updating…” during background employee/account filtering while retaining only same-account, same-role results. Search debounce is 300ms. Include clear-filter controls and actionable empty states.

`FeedbackProvider` announces success through a status message. Do not announce ticking attendance timers every second. Share `useAttendanceClock` between dashboard and attendance rather than duplicating clock mutations. Preserve clock request IDs across retries. For asynchronous PTO operations, say “submitted” and display processing status until the service reports completion.

Use `statusLabel` for sentence-case status/role text. Never show an absent score as 0%; distinguish “No completed shifts” and “Not available”. Pay estimates must retain provisional status and visible exclusions adjacent to the amount.

## Role contract

| Role          | Priority workflow                                 | Restrictions preserved                                  |
| ------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Employee      | Clock, upcoming shifts, own time off, own pay     | No administration or reviewer controls                  |
| Supervisor    | Staffing and time-off review, plus personal work  | No attendance approval or broader pay access            |
| Manager       | Staffing, time-off and attendance review          | No employee/account administration                      |
| Administrator | Setup and access management, organization, review | Personal clock hidden; self-account safeguards retained |

All controls must follow the current role and row scope. Backend authorization remains required. Clear cached session data on account changes; do not reuse differently authorized placeholder results.

## Verification

Run `npm run build`, `npm run lint`, and `npm test`. Run isolated frontend browser coverage with `npx playwright test e2e/ui-refinement.spec.ts`; its intercepted API responses do not mutate EMS services. The existing service E2E suites require the isolated backend gateway at port 18080. Review keyboard flow, focus visibility, screen-reader names, disabled/error states, slow network, and actual-surface contrast manually before release.
