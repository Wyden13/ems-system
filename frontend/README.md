# EMS frontend

React, TypeScript, MUI and TanStack Query frontend for the integrated workforce MVP. See [backend setup and current feature status](../ems-services/DOCUMENTATION.md).

Use Node.js 24.21.0 or newer in the 24.x series to match CI's updated Edmonton timezone rules. Older timezone data incorrectly predicts an autumn clock change in November 2026. DST tests use the historical November 2025 transition.

Run `npm ci` and `npm run dev`, then open http://localhost:5173. API requests now use the deployed AWS microservices through https://d2z6z22jatofwt.cloudfront.net. Sign in with an account from the AWS deployment.

Vite proxies `/api` to the AWS gateway for both development and `npm run preview`. It forwards the gateway's HTTPS origin to satisfy the services' origin checks while keeping CSRF and refresh cookies on the frontend's origin. `EMS_GATEWAY_URL` in `.env` or the shell overrides the gateway; shell values take precedence. Restart Vite after changing it. To use the local services, run `EMS_GATEWAY_URL=http://localhost:8080 npm run dev`. The browser tests override this setting with their isolated local gateway.

For HTTP loopback requests only, Vite removes `Secure` from the upstream `XSRF-TOKEN` and `ems_refresh` cookies so Safari can retain them on localhost. `HttpOnly`, `SameSite`, paths and expiry remain intact. HTTPS, non-loopback requests and all other cookies retain their original attributes; production backend cookies remain secure.

For a hosted production build, configure the web host to proxy `/api/*` to the AWS gateway, forwarding cookies, authorization headers, query strings, and the gateway's origin with API caching disabled. Vite's proxy is only active in its development and preview servers; `dist` uses relative `/api` URLs. Keeping the frontend and API on one browser origin preserves the backend's `SameSite=Lax` session cookies.

All roles have a real dashboard, attendance, payroll estimates, scheduling and PTO navigation. Supervisors plan shifts/review PTO within their employee department; managers/admins work across departments. Only admins manage accounts/employees/organization and allocate PTO. Account links are required for personal workforce features. Payroll estimates include approved worked time only; paid leave, scheduled break deductions and scores remain deferred.

Access tokens stay in memory; refresh tokens use HttpOnly cookies. Each service independently enforces JWT and row-level authorization. Forms preserve input on errors and new workflow screens use actual API data.

The onboarding prototype is available at `/onboarding-preview` without signing in, or under **Onboarding preview** for managers/admins. It uses fictional session-only data and does not send emails, create accounts or change workforce access. Switch between the manager/admin and employee views to try invitation, setup, draft, submission, changes, approval, expiry and cancellation. See [agreed onboarding design](docs/onboarding-design.md) and [detailed backend implementation plan](docs/onboarding-backend-plan.md).

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
../ems-services/scripts/test-stack.sh
```

The browser script builds the service images and uses its own isolated database volume. It tests management, attendance, scheduling, PTO and role isolation. Normal platform data is not reset.

The isolated Prairie Market demo uses 100 real linked accounts, four weeks of retail schedules/attendance and protected base wage estimates. Run `npm run demo:start` and `npm run dev:demo`, then open http://127.0.0.1:16173. See [demo accounts, scenarios and commands](docs/retail-demo.md). The normal AWS-backed app remains on its existing URL.

Appearance follows the system theme by default. Use **Change appearance** in the header (or on the sign-in/public onboarding page) to select Light, Dark, or System; the choice is saved in this browser. Dashboard actions sit beside section titles, and lists group records by workflow status while retaining filters, pagination, permissions, and row actions.
