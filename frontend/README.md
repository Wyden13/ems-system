# EMS Frontend

## Introduction

The web interface for the Employee Management System (EMS), a portfolio project supporting employees, supervisors, managers, and administrators through everyday workforce tasks.

## Objective

Demonstrate a responsive React application connected to secure backend APIs, with role-based workflows for employee administration, scheduling, attendance, time off, and pay estimates.

## Core Features

- Role-based dashboards, sign-in, and profile management.
- Administrator tools for accounts, employees, departments, and locations.
- Shift planning, publication, availability, and assignment responses.
- Clock-in/out, attendance review, corrections, and audit history.
- PTO requests, approvals, balances, and allocations.
- CAD gross-pay estimates from approved worked time.
- Light, dark, and system appearance; a public onboarding preview.

Payroll estimates exclude taxes, deductions, payments, paid leave, and scheduled break deductions. The onboarding preview uses fictional session-only data.

## Technologies

React 19, TypeScript, Vite, Material UI, React Router, and TanStack Query. Verification uses ESLint, Vitest, Testing Library, and Playwright.

## Installation

Requirements: Node.js 24 (used in CI), npm, and a running EMS backend.

Complete the [backend setup](../ems-services/README.md), then run these commands from `frontend/`. Skip the copy command if `.env` already exists:

```sh
npm ci
cp .env.example .env
EMS_GATEWAY_URL=http://localhost:8080 npm run dev
```

Open <http://localhost:5173> and sign in with the administrator created during backend setup. The command targets the local gateway; without the override, `.env.example` configures the AWS gateway. You can also set `EMS_GATEWAY_URL` in `.env` and restart Vite. Shell values take precedence.

## Usage

1. **Administrator:** create locations, departments, accounts, and employee records; link employees to accounts, set hourly rates, and allocate PTO balances.
2. **Manager or supervisor:** plan and publish shifts, assign employees, and review PTO requests. Supervisors work within their department.
3. **Employee:** set availability, respond to assignments, clock in/out, and request time off. Managers or administrators review attendance.
4. **Payroll:** view CAD gross-pay estimates for approved worked time in a selected pay period.

Personal workflows require a linked employee record. Users cannot approve their own PTO or review their own attendance.

Explore the onboarding prototype at `/onboarding-preview`. For sample workforce data, follow the isolated [retail demo](docs/retail-demo.md). Run `npm run build` to generate `dist/`, then `npm run preview` to inspect it locally. Production setup is covered in the [AWS hosting guide](../ems-services/deploy/aws/README.md).

## Testing

```sh
npm run lint
npm run build
npm test
npx playwright install chromium
../ems-services/scripts/test-stack.sh
```

The last command requires the backend prerequisites and runs browser workflows against an isolated stack with its own database volume.

## Documentation

- [Backend features, API, and access rules](../ems-services/DOCUMENTATION.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Onboarding design](docs/onboarding-design.md) and [backend plan](docs/onboarding-backend-plan.md)
- [Cloud demo](docs/cloud-demo.md)

## License

No license is currently specified for this project.
