# Employee onboarding: agreed design and frontend prototype

## Confirmed choices

| Decision | Agreed behavior |
| --- | --- |
| Organization email | Generate an EMS login only; do not provision a mailbox |
| Password | Employee chooses their own password through the invitation |
| Hiring permissions | Managers and admins can create invitations and approve onboarding |
| Required package | Personal details and terms; banking, tax and SIN can follow later |
| Contract | Deferred entirely for now, interpreting the user's request to skip it |
| Acceptance | Happens outside EMS; EMS sends only a setup invitation |
| Workforce access | Begins immediately after onboarding approval, without waiting for the start date |
| Invitation validity | 7 days; managers/admins can resend |
| Current delivery | Interactive frontend prototype, plus a detailed backend implementation plan |

## Why this flow

The hiring manager enters the accepted hire's identity and employment details once. The employee receives the setup invitation at their personal email, chooses a password, reviews prefilled information and accepts the onboarding terms. A manager or admin reviews the submission and approves it or asks for changes. Approval enables workforce access.

This replaces the current separate employee creation, account creation and manual linking process with one visible sequence. Sending to personal email works before the organization login exists. Employee-chosen passwords keep passwords out of emails. Explicit approval prevents unfinished onboarding from being treated as completed. Deferring payroll information and contracts keeps the initial onboarding small.

## Prototype

- Open `/onboarding-preview` without signing in. It contains fictional sample hires only and makes no onboarding or authentication API requests.
- Managers/admins also have an **Onboarding preview** navigation item at `/onboarding`. Existing employee/account administration remains admin-only.
- Switch between **Manager / admin view** and **Employee view** to try both sides.
- Create a demo invitation, preview its email, set up a demo account, complete personal details and accept placeholder terms, save a draft, submit, request changes, resubmit, and approve.
- Simulate invitation expiry, resend, and cancel onboarding to review those branches.
- Data lives in React state for the page session and resets on reload or unmount. No emails, accounts, employee records or real permissions change. Password input is discarded after simulated setup and never included in the hire state.
- Organization logins use `example.invalid` as a placeholder. The actual domain and naming policy will be configured in the backend.
- Required prototype personal details are first name, last name, phone and address. Birth date and additional fields are not collected in this prototype; the production form schema should be agreed before backend form validation is finalized.
- Terms are clearly labeled demo terms. Production needs organization-approved, versioned terms content.

## States

`INVITED → IN_PROGRESS → SUBMITTED → COMPLETED`

`SUBMITTED → CHANGES_REQUESTED → SUBMITTED`

Nonterminal records can be cancelled. Invitation expiry is separate from onboarding state; it blocks account setup until resend and does not discard the hire's record.

A setup email is not a job acceptance email. The organization login is not a mailbox. Approval in the prototype only demonstrates the eventual workforce access policy.

## Next implementation

See [the backend implementation plan](onboarding-backend-plan.md) for service ownership, schema, endpoints, authentication, retry handling, access controls, delivery, migration and tests.
