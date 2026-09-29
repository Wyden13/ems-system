# EMS frontend

React, TypeScript, MUI and TanStack Query frontend for the integrated workforce MVP. See [backend setup and current feature status](../ems-services/DOCUMENTATION.md).

Run `npm ci` and `npm run dev` after starting the services and bootstrapping an admin. Open http://localhost:5173. Vite proxies `/api` to the gateway at http://localhost:8080; `EMS_GATEWAY_URL` overrides it.

All roles have a real dashboard, attendance, payroll estimates, scheduling and PTO navigation. Supervisors plan shifts/review PTO within their employee department; managers/admins work across departments. Only admins manage accounts/employees/organization and allocate PTO. Account links are required for personal workforce features. Payroll estimates include approved worked time only; paid leave, scheduled break deductions and scores remain deferred.

Access tokens stay in memory; refresh tokens use HttpOnly cookies. Each service independently enforces JWT and row-level authorization. Forms preserve input on errors and new workflow screens use actual API data.

```sh
npm run build
npm run lint
npm test
npx playwright install chromium
../ems-services/scripts/test-stack.sh
```

The browser script builds the service images and uses its own isolated database volume. It tests management, attendance, scheduling, PTO and role isolation. Normal platform data is not reset.
