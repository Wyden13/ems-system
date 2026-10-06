# Backend implementation plan: employee onboarding

This plan implements the confirmed onboarding design. It is a proposed service contract, not a description of existing endpoints. The frontend prototype is the reviewable first deliverable; no backend services are changed by it.

## 1. Scope and completion criteria

A manager/admin can invite a hire who has already accepted their offer outside EMS. A setup email reaches the hire's personal email, and its link expires after seven days. The employee chooses a password and receives an organization-shaped EMS login, without a mailbox. They complete personal details and accept versioned terms. Any authorized manager/admin can review the submission, request changes or approve it. Approval immediately enables scheduling, attendance and time off; the start date does not delay access.

Banking, tax, SIN collection and contracts are outside this first backend milestone. Do not add placeholders that store these values insecurely or require them for completion. Do not automatically promote invitees into manager/admin login roles; new hires receive EMPLOYEE access by default. Elevated access remains a separate administrator action.

Production configuration needed before launch: organization login domain/naming convention, approved terms content, sender address/email provider, frontend setup URL and the final required personal fields. These settings do not block reviewing the current prototype.

## 2. Existing code constraints

- `ems-people-service` owns employees, departments and locations, uses PostgreSQL/Flyway and currently restricts `/api/**` to ADMIN. Add precise onboarding rules before its broad existing matcher; do not broaden all employee APIs to managers.
- `ems-auth-service` owns account credentials, BCrypt password hashing and sessions. Its public allowlist currently contains login, refresh, logout and CSRF endpoints only. Add the setup endpoints explicitly.
- The existing admin create-account DTO accepts an administrator-supplied password with an 8-character minimum. The change-password DTO requires 12–72 non-whitespace characters, uppercase, lowercase and a digit. Introduce a shared policy for invitation setup and password changes and enforce the BCrypt 72-byte limit on the server.
- `ems-gateway-service` routes `/api/v1/auth/**` to auth and `/api/employees/**` to people; there is no onboarding route. Add `/api/onboarding/**` and terms routes to people and corresponding authorization rules at the gateway.
- `ems-contracts` already defines account, department and workforce reference gRPC services. The services use reference validation and mTLS infrastructure. Extend authenticated internal contracts for onboarding provisioning and account eligibility.
- `EmployeeInfo` includes `active`. Attendance, scheduling and leave check it for some operations; this is not sufficient proof that every read and write is blocked before onboarding approval. Audit all workforce entry points.
- The current employee creation DTO uses `@PastOrPresent` for hire date. Onboarding must accept a future start date: use a distinct onboarding employment DTO, then explicitly reconcile employee creation/validation with future hire dates during finalization.
- The notification service exposes email/notification interfaces tied to employee IDs. A hire has no employee ID yet. Add recipient-based invitation delivery; do not require an employee record just to send an email. The existing interface is not evidence of a configured production email provider.

## 3. Service ownership

| Service | Responsibility |
| --- | --- |
| People | Hire record, manager-entered employment information, employee personal draft, terms acceptance, submission/review state, audit trail and approved employee record |
| Auth | Unique login reservation, hashed setup token, expiry/revocation, password setup, account creation, personal recovery email and session eligibility |
| Notification | Recipient-based transactional email, provider message IDs, delivery events and retry reporting |
| Workforce | Enforce current account onboarding eligibility on scheduling, attendance, PTO and related workforce routes |
| Gateway | Explicit public setup routes, protected onboarding routes, consistent rate limits and forwarding |
| Contracts | Idempotent provisioning and eligibility RPCs; generated clients from shared proto files |

Keep cross-service data access behind contracts, not cross-database SQL. For this repository, people is the workflow owner; auth is the sole credential owner. Prefer adding a small worker/outbox to the existing deployment over introducing a new broker solely for onboarding. Notification must be wired into the deployment if it is not already running there.

## 4. Database changes

Add new Flyway migrations using the next free migration version in each service.

### People database

`onboarding_hires`

- UUID primary key; normalized personal email; manager creator UUID; first/last name; phone; department ID; job title; intended start date; pay rate and workforce role if needed for employee creation.
- State: INVITED, IN_PROGRESS, SUBMITTED, CHANGES_REQUESTED, APPROVING, COMPLETED, CANCELLED.
- Unique linked auth account UUID when set; unique resulting employee ID when finalized; organization login snapshot.
- Required terms version; submission revision; reviewer UUID; submitted/reviewed/completed/cancelled timestamps; feedback; numeric optimistic-lock version.
- UTC creation/update timestamps. Store start date as a date, not a timestamp.
- Track provisioning operation and external delivery status separately from onboarding state.
- Reject duplicate open onboardings for the same normalized personal email, with a partial unique index. Rehire policy can allow a new record after completion/cancellation without linking to a new account automatically.

`onboarding_personal_drafts`

- Onboarding ID FK; first/last name; phone; address; optional agreed fields; draft revision and updated timestamp.
- Submitted revisions become immutable snapshots so review applies to a specific package. After requested changes, create a new revision and require resubmission.

`onboarding_terms` and `onboarding_terms_acceptances`

- Immutable terms version, approved content, content digest and published timestamp.
- Acceptance references onboarding ID, account ID, terms version/digest, accepted timestamp and submission revision.
- The backend resolves the current required version; clients cannot fabricate an acceptance record or arbitrary acceptance timestamp.
- Never silently replace accepted terms. If policy changes during onboarding, explicitly request reacceptance before approval.

`onboarding_audit_events`

- Record event ID, onboarding ID, actor ID/type, action, previous/new state, revision and timestamp.
- Include invitation/resend/cancel/setup/submit/changes-requested/approval outcomes. Avoid passwords, tokens and full personal form payloads in audit messages.

`onboarding_outbox`

- Event UUID, aggregate ID/version, event type, minimal payload, attempt count, next retry timestamp and processing state. Write workflow state and its outbox event in the same transaction.

### Auth database

`onboarding_setup_invitations`

- Invitation UUID, onboarding UUID, unique reserved organization login, personal recipient email, token hash, issued/expiry timestamps, consumed/revoked timestamps, generation, provisioning state and linked account UUID.
- Store only a cryptographic hash of the bearer token in the invitation table. Seven-day validity uses server UTC time.
- Resend rotates the token and generation, invalidating every earlier link for that hire.

Account additions

- Separate organization login from verified personal recovery email. The login has no mailbox; password recovery and onboarding notifications go to the personal address.
- New onboarding-linked accounts have workforce eligibility PENDING. They may authenticate into onboarding, but cannot access workforce APIs until approval.
- Preserve existing ACTIVE/SUSPENDED/DISABLED account status semantics. Onboarding eligibility is a separate capability, not a replacement for account suspension.
- Enforce unique onboarding ID and normalized login in provisioning records. Reserve logins before sending emails and allocate collision suffixes atomically under a uniqueness constraint.

Auth outbox/inbox and delivery staging

- Durable idempotency records for cross-service commands/results.
- Invitation delivery requires the original token. Stage it only in an encrypted, access-restricted delivery payload with short retention; do not put raw tokens in ordinary plaintext outbox rows. Purge the staged payload after provider acceptance or invitation revocation. The long-lived invitation record retains only the hash.

## 5. Proposed HTTP API

All mutations carry an idempotency key where retries could duplicate work. State-changing review operations additionally carry the current version. Responses expose a stable error code, message and field errors; never expose password/token hashes.

| Method and route | Caller | Behavior |
| --- | --- | --- |
| GET `/api/onboarding` | MANAGER/ADMIN | Paginated summary list; filters for state, department and search; no full personal form payload |
| POST `/api/onboarding` | MANAGER/ADMIN | Validate accepted-hire information and active department; create record and queue invitation issuance; return 201 with resource location and pending delivery state |
| GET `/api/onboarding/{id}` | MANAGER/ADMIN | Details, delivery status, reviewable revision and history according to permissions |
| POST `/api/onboarding/{id}/resend` | MANAGER/ADMIN | Only before account setup; invalidate prior invitation and issue a new seven-day link |
| POST `/api/onboarding/{id}/cancel` | MANAGER/ADMIN | Cancel non-completed onboarding, revoke invitations and disable onboarding-linked pending account access |
| GET `/api/onboarding/me` | Authenticated invitee | Own prefilled details, employment summary, current draft and required terms |
| PUT `/api/onboarding/me/personal` | Authenticated invitee | Save allowed personal fields while IN_PROGRESS/CHANGES_REQUESTED; cannot edit employment, pay, login role or review state |
| POST `/api/onboarding/me/terms-acceptance` | Authenticated invitee | Record agreement to the actual required published terms version |
| POST `/api/onboarding/me/submit` | Authenticated invitee | Validate required fields/terms on server; freeze submission revision; move to SUBMITTED |
| POST `/api/onboarding/{id}/request-changes` | MANAGER/ADMIN | Require nonblank feedback and matching revision/version; return to CHANGES_REQUESTED |
| POST `/api/onboarding/{id}/approve` | MANAGER/ADMIN | Require complete immutable submitted revision; enter APPROVING; finalize employee/account eligibility; return 202 until completed |
| GET `/api/onboarding/terms/{version}` | Authenticated invitee or reviewer | Approved, immutable terms content |
| POST `/api/v1/auth/onboarding/inspect` | Setup token, before login | Read-only token inspection; return limited setup context when valid; do not consume token |
| POST `/api/v1/auth/onboarding/complete` | Setup token + chosen password, before login | Consume valid token atomically, create/link account idempotently, establish a normal session or direct to login |

Example create body:

```json
{
  "firstName": "Alex",
  "lastName": "Morgan",
  "personalEmail": "alex@example.com",
  "phoneNumber": "555-0101",
  "departmentId": 12,
  "jobTitle": "Coordinator",
  "startDate": "2026-10-19",
  "payRate": "24.50"
}
```

The frontend prototype uses department text and omits pay rate to review the experience. The production form uses the real department picker and gathers the pay rate needed by the employee schema before approval. The client cannot set an elevated login role or select an arbitrary account ID.

Status codes: 400 validation; 401 unauthenticated; 403 insufficient role or workforce eligibility; 404 unavailable/not-owned record; 409 duplicate hire, invalid transition or stale version; 410 unusable/expired setup link; 429 rate limit. Setup errors should avoid unnecessary account-existence disclosure.

## 6. Invitation and setup sequence

1. Manager/admin creates the onboarding record. People validates inputs and writes the hire plus issuance outbox event in one transaction.
2. A worker calls an authenticated auth RPC with the onboarding UUID as an idempotency key. Auth reserves a unique organization login, generates at least 256 bits of random token material, stores its hash and seven-day expiry, and stages encrypted delivery data.
3. Delivery worker sends the recipient-based invitation through notification. Record queued, provider-accepted, delivered/bounced and failed states independently. Provider acceptance is not proof of inbox delivery. Retry transient failures with bounded exponential backoff; surface permanent failures and allow resend.
4. Email contains only setup instructions, the reserved EMS login and the link. Acceptance happens externally, so do not send an offer/acceptance email.
5. Use a configured HTTPS frontend origin and a setup URL carrying the token in the fragment. The setup page extracts it into memory and removes it from the visible URL before rendering. Send it to auth in a POST body. Do not log tokens, include them in analytics, or save them in browser storage. GET/inspection must not consume the invitation because mail scanners may open links.
6. On final password submission, auth locks the invitation and validates hash, expiry, generation, cancellation and consumption state. Password confirmation is a client convenience; the server enforces its own password rules.
7. Auth stores only the password hash, creates an EMPLOYEE account with PENDING workforce eligibility and consumes the invitation within one transaction. An outbox event reports setup completion to people. Retries return the same provisioning result without recreating an account or storing a replacement password.
8. People links the account and moves onboarding to IN_PROGRESS. Until synchronization finishes, `/me` returns a clear setup-processing state. No employee workforce access is granted yet.
9. An interrupted setup can be resumed through normal login to the generated login, with recovery through the personal email. Do not revive consumed setup tokens as password-reset tokens.

Protect unauthenticated setup POSTs with explicit origin/CSRF rules consistent with the auth service and rate limiting. Do not turn off CSRF globally. No setup-token validation alone should grant manager/admin permissions.

## 7. Approval and workforce activation

People owns approval state. Approval is a resumable operation because account and employee updates cross database boundaries.

1. Transactionally lock/version-check the submitted record and verify required personal fields plus accepted terms. Save reviewer identity and move to APPROVING with a durable operation UUID.
2. Create an initially inactive employee record in people using manager-entered department, job title, pay rate and future-capable hire date plus the approved personal snapshot. Link the provisioned account. Enforce unique onboarding-to-employee mapping. Keep workforce eligibility blocked during finalization so roster assignment cannot start early.
3. Auth receives an idempotent internal command to mark that account's onboarding eligibility APPROVED, without undoing account suspension or changing its role. Record an acknowledgement via outbox/inbox.
4. People marks COMPLETED and activates the linked employee in the same local transaction after durable confirmation. A failed operation stays APPROVING with a retriable status rather than falsely showing completion. Expose progress to the UI and alert operators after bounded retries.
5. Workforce authorization must consult a server-side eligibility check for every protected onboarding-linked account, including read/list paths. Fail closed while onboarding is incomplete, cancelled or eligibility lookup is unavailable. Do not rely only on a stale JWT claim or `EmployeeInfo.active` on selected writes.
6. The eligibility check requires confirmed completion in people and an enabled account in auth. This closes the gap between auth's acknowledgement and people recording COMPLETED. Once completed, workforce access starts immediately, irrespective of start date.
7. Existing account suspension and employee deactivation continue to restrict access after onboarding. Legacy accounts without onboarding records follow their existing eligibility rules; never accidentally grandfather an incomplete new onboarding by treating a missing lookup as legacy.

Provide a batch eligibility lookup for roster operations to avoid an RPC per row. Add new proto fields using new field numbers and deploy compatible readers before writers; define absent eligibility explicitly for legacy records.

## 8. Permissions and state rules

- MANAGER and ADMIN can create/resend/cancel invitations and approve/request changes for submitted records. This is an explicit allowlist; SUPERVISOR is excluded. Do not compare role names or enum ordinal values as a hierarchy.
- Managers act across departments for this first implementation, matching the current manager workforce scope. Add narrower organization scope only if the product later needs it.
- Employee self-service uses authenticated account identity from the token and server-side record lookup; never trust a client-supplied employee/onboarding owner ID.
- Newly invited employees may use onboarding, account settings and logout; enforce server-side restrictions on normal workforce reads and writes. Hide/redirect the corresponding frontend navigation as a user experience aid.
- Submitted data is read-only until a reviewer requests changes. A reviewer cannot silently edit the employee's submitted personal information or accept terms for them.
- Before account setup, resend replaces the invitation. After account setup, use ordinary login/recovery rather than issuing a fresh account setup invitation.
- Cancellation wins over incomplete setup/approval: serialize state changes with version/row locks, reject approval after cancellation and reconcile late provisioning events into disabled pending access.
- Completed onboarding cannot be cancelled through this workflow. Normal employment deactivation is a separate existing action.
- Approval should use the expected submitted revision and record the actor; simultaneous reviewers get a 409 rather than overwriting each other's decisions.

## 9. Frontend integration after prototype approval

1. Replace in-memory demo records with typed API hooks, scoped query keys, pagination and actual delivery/processing states.
2. Add the production unauthenticated setup route separately from `/onboarding-preview`; keep demo links and sample data isolated. Allow refresh/reload using the server session rather than browser storage.
3. Replace the free-text department with actual authorized department options. Gather pay rate and configured workforce role as employment fields; employee cannot change them.
4. Bind save/submit/terms actions to self-service endpoints. Preserve unsaved input on validation or network errors; do not show success until the server confirms the action.
5. Load the organization's terms version and require explicit acceptance. Display reviewer feedback and allow correction/resubmission.
6. Poll boundedly while delivery/setup/approval is processing and use authoritative access state after completion.
7. Keep managerial onboarding navigation separate from admin-only employee/account administration. Pending new employees land on their onboarding page after login, then dashboard after approval.

## 10. Implementation order and reviewable milestones

| Milestone | Changes | Exit condition |
| --- | --- | --- |
| 1. Contracts and migrations | Shared DTO/error/state definitions; people/auth tables; proto provisioning/eligibility methods | Migrations apply to empty and current databases; API contract reviewed |
| 2. Hire creation and authorization | People create/list/detail; exact MANAGER/ADMIN rules; gateway routes; real department/pay validation | Managers/admins create hires; employees/supervisors denied; existing admin APIs unchanged |
| 3. Invitation delivery | Auth reservation/token lifecycle; encrypted delivery staging; recipient email provider; retry/status | Test inbox receives invitation; expiry/resend/cancel work; no plaintext token/password logs |
| 4. Account setup and drafts | Public setup endpoints; pending accounts; self-service draft/terms/submit; shared password policy | One account per hire; employee can resume own draft; preapproval workforce access blocked |
| 5. Review and finalization | Changes requested, resumable approval, employee linking, current eligibility checks | Approval unlocks workforce access; outages/retries do not duplicate employees or unlock early |
| 6. Frontend replacement and rollout | Real API hooks; production setup route; staff queue; pending-account navigation | End-to-end flow works through local gateway and staging with all role/error branches |

## 11. Tests required before production

- Unit tests: allowed state transitions; normalization/collision allocation; required personal fields; terms version checks; shared password policy; seven-day boundary using an injected Clock.
- PostgreSQL integration tests: duplicate open hires, simultaneous setup consumption, simultaneous login reservation, resend vs old-token completion, stale review versions, concurrent cancel vs setup/approval and unique employee/account links.
- Authorization tests at gateway and services: manager/admin allowed; supervisor/employee denied for managerial operations; employee cannot read/change another hire; elevated login role injection rejected.
- Eligibility tests: pending and cancelled invitees cannot read or write workforce data through any route; approved accounts gain access even before their start date; suspended/deactivated accounts stay blocked; existing legacy workflows still work.
- Delivery tests using a fake/local provider: transient failure retry, permanent bounce visibility, duplicate provider callbacks, encrypted payload cleanup, dispatch vs delivery distinction and no acceptance email.
- Cross-service fault tests: auth succeeds then people fails; people creates employee then auth times out; duplicate/out-of-order events; interrupted approval; cancellation racing delayed setup completion. Assert one account/employee and fail-closed access.
- Browser tests: invitation → setup → draft resume → terms → submission → changes → resubmission → approval; expired/replaced/cancelled links; no passwords/tokens/personal data in browser storage; narrow-screen and keyboard operation.

## 12. Rollout and operation

Use a feature flag for new onboarding. Apply additive migrations, deploy compatible contracts/services, configure and verify email delivery in staging, then enable a small internal cohort. Keep existing employees/accounts unchanged. A production rollout needs working organization domain configuration, approved terms, email sender configuration and verified eligibility checks.

Track invitation queue age, delivery/bounce failures, stuck setup/approval operations and provisioning retry counts. Provide an operator reconciliation command keyed by operation UUID; never recover by creating a second employee/account. Retain audit records according to the organization's chosen policy, and purge expired/revoked token delivery payloads promptly.

Rollback disables creation of new onboarding records while retaining existing records and permitting recovery/reconciliation. Do not delete migrations or reverse created accounts blindly. The setup session and existing credentials remain usable according to account status; workforce eligibility stays blocked until approval finalization is complete.
