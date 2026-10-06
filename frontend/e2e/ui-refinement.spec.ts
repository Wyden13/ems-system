import { test, expect, type Page } from "@playwright/test";
import {
  addDays,
  businessDate,
  currentPeriod,
  midnight,
} from "../src/api/attendance";
import type { Role } from "../src/api/types";

// Isolated API fixtures: these UI tests never write to the running EMS services.
async function fixture(page: Page, role: Role) {
  const day = businessDate();
  const account = {
    id: "current-account",
    email: `${role.toLowerCase()}@example.test`,
    role,
    status: "ACTIVE",
    createdAt: midnight(day),
    updatedAt: midnight(day),
    lastLoginAt: null,
  };
  const worker = {
    id: 1,
    name: "Alex Worker",
    employeeNumber: "000001",
    departmentId: 1,
    active: true,
    self: role === "EMPLOYEE" || role === "SUPERVISOR",
  };
  const people =
    role === "MANAGER"
      ? [worker, { ...worker, id: 2, name: "Morgan Manager", self: true }]
      : [worker];
  const category = {
    id: 1,
    name: "Morning",
    color: "#5B4BE1",
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    active: true,
  };
  const department = {
    id: 1,
    name: "Operations",
    locationId: 1,
    locationName: "Edmonton",
    archived: false,
  };
  let shift = {
    id: 10,
    shiftCategoryId: 1,
    categoryName: "Morning",
    departmentId: 1,
    locationId: 1,
    startsAt: new Date(
      Date.parse(midnight(addDays(day, 3))) + 9 * 3600000,
    ).toISOString(),
    endsAt: new Date(
      Date.parse(midnight(addDays(day, 3))) + 17 * 3600000,
    ).toISOString(),
    requiredEmployees: 2,
    status: "PUBLISHED",
    version: 0,
    assignments: [{ id: 3, employeeId: 1, status: "ASSIGNED", version: 0 }],
  };
  const request = {
    id: 20,
    employeeId: 1,
    ptoTypeId: 1,
    ptoTypeName: "Vacation",
    startDate: addDays(day, 3),
    endDate: addDays(day, 3),
    hours: 8,
    status: "PENDING",
    reasonCategory: "Vacation",
    employeeSignature: "Alex Worker",
    signedAt: new Date().toISOString(),
    version: 0,
    operationError: null,
    comment: null,
  };
  const balance = {
    id: 1,
    ptoTypeId: 1,
    ptoTypeName: "Vacation",
    accruedHours: 24,
    availableHours: 16,
    reservedHours: 8,
    usedHours: 0,
  };
  const login = {
    ...account,
    id: "linked-account",
    email: "alex@example.test",
    role: "EMPLOYEE",
  };
  const employee = {
    id: 1,
    employeeNumber: "000001",
    firstName: "Alex",
    lastName: "Worker",
    email: "alex@example.test",
    departmentId: 1,
    hireDate: day,
    role: "EMPLOYEE",
    payRate: "25.00",
    active: true,
    userAccountId: "linked-account",
    jobTitle: "Technician",
    phoneNumber: null,
    address: null,
    birthDate: null,
  };
  let active: null | { id: number; clockIn: string } = null;
  const calls: {
    path: string;
    search: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const method = req.method();
      const body = req.postData() ? req.postDataJSON() : null;
      calls.push({ path, search: new URL(req.url()).search, method, body });
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me") data = account;
      else if (path === "/api/employees/summary")
        data = { total: 1, active: 1, inactive: 0 };
      else if (path === "/api/employees")
        data =
          method === "GET"
            ? {
                content: [employee],
                totalElements: 1,
                totalPages: 1,
                number: 0,
                size: 20,
              }
            : { ...employee, ...body };
      else if (path === "/api/departments") data = [department];
      else if (path === "/api/locations") data = [{ id: 1, name: "Edmonton" }];
      else if (path === "/api/v1/admin/accounts")
        data = {
          content: [login],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        };
      else if (path === "/api/v1/admin/accounts/linked-account") data = login;
      else if (path === "/api/time-entries/state")
        data = {
          serverTime: new Date().toISOString(),
          employeeId: role === "MANAGER" ? 2 : 1,
          active,
          todaySeconds: 0,
        };
      else if (path === "/api/time-entries/current")
        data = { serverTime: new Date().toISOString(), employees: [] };
      else if (path === "/api/time-entries/clock-in") {
        active = { id: 7, clockIn: new Date().toISOString() };
        data = active;
      } else if (path === "/api/time-entries/clock-out") {
        data = { ...active, clockOut: new Date().toISOString() };
        active = null;
      } else if (path === "/api/time-entries/people") data = people;
      else if (path === "/api/time-entries")
        data = [
          {
            id: 7,
            employeeId: 1,
            clockIn: new Date(
              Date.parse(midnight(day)) + 9 * 3600000,
            ).toISOString(),
            clockOut: new Date(
              Date.parse(midnight(day)) + 17 * 3600000,
            ).toISOString(),
            workedSeconds: 28800,
            status: "PENDING_APPROVAL",
            version: 0,
          },
        ];
      else if (path === "/api/timesheets/summary")
        data = { pendingApproval: 1 };
      else if (path === "/api/timesheets/score")
        data = {
          status: "AVAILABLE",
          expectedEvents: 0,
          missedEvents: 0,
          missPercentage: 0,
          explanation: "Completed shifts only.",
        };
      else if (path === "/api/shifts/options")
        data = { people, departments: [department] };
      else if (path === "/api/shifts" && method === "GET") data = [shift];
      else if (path === "/api/shifts" && method === "POST") {
        shift = { ...shift, ...body, id: 11, status: "DRAFT" };
        data = shift;
      } else if (path === "/api/shifts/10") data = shift;
      else if (path === "/api/shift-categories") data = [category];
      else if (path === "/api/pto/people") data = people;
      else if (path === "/api/pto/types")
        data = [{ id: 1, name: "Vacation", paid: true }];
      else if (path.includes("/pto/balances")) data = [balance];
      else if (path === "/api/pto/requests")
        data = method === "GET" ? [request] : { ...request, ...body };
      else if (path.endsWith("/conflicts")) data = { shiftIds: [10] };
      else if (path === "/api/payroll/estimates")
        data = {
          calculatedAt: new Date().toISOString(),
          workweekCoverageEnd: addDays(day, 7),
          estimates: [
            {
              employeeId: 1,
              employeeName: "Alex Worker",
              employeeNumber: "000001",
              hourlyRate: "25.00",
              grossPay: "200.00",
              approvedSeconds: 28800,
              regularSeconds: 28800,
              overtimeSeconds: 0,
              provisional: true,
              pendingEntries: 1,
            },
          ],
        };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },
  );
  return { calls, day };
}

for (const role of ["EMPLOYEE", "SUPERVISOR", "MANAGER", "ADMIN"] as const) {
  test(`${role}: dashboard priorities and navigation respect role permissions`, async ({
    page,
  }) => {
    const { calls } = await fixture(page, role);
    await page.goto("/dashboard");
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page).toHaveTitle("Dashboard | EMS");
    if (role !== "ADMIN")
      await expect(
        page.getByRole("button", { name: "Clock In", exact: true }),
      ).toBeVisible();
    if (role === "ADMIN" || role === "MANAGER")
      await expect(
        page.getByRole("heading", { name: "Attendance review" }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: "Attendance review" }),
      ).toHaveCount(0);
    if (role === "ADMIN")
      await expect(
        page.getByRole("link", { name: "Employees", exact: true }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("link", { name: "Employees", exact: true }),
      ).toHaveCount(0);
    await expect(page.getByText(/requests? awaiting approval/)).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`dashboard-${role.toLowerCase()}.png`),
      fullPage: true,
    });
    if (role === "ADMIN" || role === "MANAGER") {
      const summary = calls.find((c) => c.path === "/api/timesheets/summary");
      expect(new URLSearchParams(summary?.search).get("from")).toBe(
        currentPeriod(),
      );
      expect(new URLSearchParams(summary?.search).get("to")).toBe(
        addDays(currentPeriod(), 13),
      );
      await page
        .getByRole("link", { name: "Review attendance", exact: true })
        .click();
      await expect(
        page.getByRole("combobox", { name: "Status", exact: true }),
      ).toContainText("Awaiting approval");
      await expect
        .poll(() => calls.find((c) => c.path === "/api/time-entries"))
        .toBeTruthy();
      const entries = new URLSearchParams(
        calls.find((c) => c.path === "/api/time-entries")?.search,
      );
      expect(entries.get("from")).toBe(midnight(currentPeriod()));
      expect(entries.get("to")).toBe(midnight(addDays(currentPeriod(), 14)));
    }
  });
}

test("employee: dashboard clock reuses state and survives navigation", async ({
  page,
}) => {
  const { calls } = await fixture(page, "EMPLOYEE");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Clock In", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clock Out", exact: true }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "View attendance records" }).click();
  await expect(
    page.getByRole("button", { name: "Clock Out", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Clock Out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clock In", exact: true }),
  ).toBeEnabled();
  expect(calls.filter((c) => c.path.endsWith("/clock-in"))).toHaveLength(1);
  expect(calls.filter((c) => c.path.endsWith("/clock-out"))).toHaveLength(1);
});

test("mobile: filters, pay cards, drawer focus and page reflow", async ({
  page,
}) => {
  await fixture(page, "EMPLOYEE");
  for (const width of [320, 375, 442, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/pto");
    await expect(
      page.getByRole("combobox", { name: "Request status" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("link", { name: "Payroll", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
    await page.goto("/payroll");
    await expect(page.getByText("My estimated gross pay")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 375)
      await page.screenshot({
        path: test.info().outputPath(`payroll-mobile.png`),
        fullPage: true,
      });
  }
});

test("planner: overnight shift controls send Mountain Time instants", async ({
  page,
}) => {
  const { calls, day } = await fixture(page, "MANAGER");
  await page.goto("/schedule");
  await page.getByRole("button", { name: "Create shift", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Department and location" })
    .click();
  await page.getByRole("option", { name: "Operations — Edmonton" }).click();
  await dialog.getByLabel("Start date", { exact: false }).fill(day);
  await dialog.getByLabel("Start time", { exact: false }).fill("22:00:17");
  await dialog.getByLabel("End date", { exact: false }).fill(addDays(day, 1));
  await dialog.getByLabel("End time", { exact: false }).fill("06:00:17");
  await expect(
    dialog.getByText("Duration: 8 hours · overnight shift"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Create shift", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const body = calls.find(
    (c) => c.path === "/api/shifts" && c.method === "POST",
  )?.body;
  expect(
    Date.parse(String(body?.endsAt)) - Date.parse(String(body?.startsAt)),
  ).toBe(8 * 3600000);
  expect(String(body?.startsAt)).toMatch(/:17\.000Z$/);
  await page.getByRole("combobox", { name: "Schedule view", exact: true }).click();
  await page.getByRole("option", { name: "Week", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next week" })).toBeVisible();
});

test("administrator: grouped setup, optional fields, searched account and contextual deactivation", async ({
  page,
}) => {
  const { calls, day } = await fixture(page, "ADMIN");
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Identity", exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("First name", { exact: false }).fill("New");
  await dialog.getByLabel("Last name", { exact: false }).fill("Worker");
  await dialog
    .getByLabel("Employee email", { exact: false })
    .fill("new@example.test");
  await dialog.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: "Operations", exact: true }).click();
  await dialog.getByLabel("Hire date", { exact: false }).fill(day);
  await dialog.getByLabel("Hourly pay (CAD)", { exact: false }).fill("25");
  await dialog
    .getByRole("combobox", { name: "Linked login account" })
    .fill("alex");
  await page
    .getByRole("option", { name: "alex@example.test (Employee, Active)" })
    .click();
  await page.screenshot({
    path: test.info().outputPath(`employee-setup.png`),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Create employee" }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    calls.find((c) => c.path === "/api/employees" && c.method === "POST")?.body
      ?.userAccountId,
  ).toBe("linked-account");
  expect(
    calls.some((c) => c.path.includes("accounts") && c.method === "GET"),
  ).toBe(true);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Alex Worker · 000001");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Deactivate employee" }),
  ).toBeVisible();
});

test("time-off: insufficient balance is blocked and reviewer sees named conflict links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { calls, day } = await fixture(page, "EMPLOYEE");
  await page.goto("/pto");
  const overview = page.getByRole("region", { name: "Time-off overview" });
  await expect(overview.getByText("2 days", { exact: true })).toBeVisible();
  await expect(overview.getByText("16 hours · Alex Worker", { exact: true })).toBeVisible();
  const table = page.getByRole("table", { name: "Time-off requests" });
  await expect(table.getByRole("columnheader", { name: "Duration", exact: true })).toBeVisible();
  await expect(table.getByRole("heading", { name: "Pending", exact: true })).toBeVisible();
  await expect(table.locator(".MuiChip-root").getByText("Pending", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("time-off-desktop.png"), fullPage: true, animations: "disabled" });
  await page
    .getByRole("button", { name: "Request time off", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Leave type" }).click();
  await page.getByRole("option", { name: "Vacation", exact: true }).click();
  await dialog.getByLabel("Start date", { exact: false }).fill(day);
  await dialog.getByLabel("End date", { exact: false }).fill(day);
  await dialog.getByLabel("Total hours", { exact: false }).fill("24");
  await dialog.getByRole("combobox", { name: "Reason for leave" }).click();
  await page.getByRole("option", { name: "Family reason", exact: true }).click();
  await dialog.getByLabel("Additional details", { exact: false }).fill("Family trip");
  await dialog.getByLabel("Employee Signature", { exact: false }).fill("Alex Morgan");
  await expect(dialog.getByText(/Available: 16 hours/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Request time off", exact: true })
    .click();
  await expect(
    dialog.getByText("Only 16 hours are available for this leave type."),
  ).toBeVisible();
  expect(
    calls.some((c) => c.path === "/api/pto/requests" && c.method === "POST"),
  ).toBe(false);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("time-off-mobile.png"), fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "History and conflicts" }).click();
  await expect(page.getByRole("dialog").getByText(/Employee Signature: Alex Worker/)).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /Morning.*Shift 10/ }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /Morning.*Shift 10/ })
    .click();
  await expect(page.locator("#shift-10")).toBeVisible();
});

test("time-off: days calculate hours without a total and require a fresh employee signature", async ({ page }) => {
  const { calls, day } = await fixture(page, "EMPLOYEE");
  await page.goto("/pto");
  await page.getByRole("button", { name: "Request time off", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Request time off", exact: true });
  await dialog.getByRole("combobox", { name: "Leave type" }).click();
  await page.getByRole("option", { name: "Vacation", exact: true }).click();
  await dialog.getByLabel("Start date", { exact: false }).fill(day);
  await dialog.getByLabel("End date", { exact: false }).fill(addDays(day, 1));
  await expect(dialog.getByText(/2 days selected · 16 hours/)).toBeVisible();
  await expect(dialog.getByLabel("Total hours", { exact: false })).not.toHaveAttribute("required");
  await expect(dialog.getByLabel("Total hours", { exact: false })).toHaveValue("");
  await dialog.getByRole("combobox", { name: "Reason for leave" }).click();
  for (const reason of ["Vacation", "Personal leave", "Funeral", "Bereavement", "Jury duty", "Family reason", "Medical leave", "Other"])
    await expect(page.getByRole("option", { name: reason, exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Bereavement", exact: true }).click();
  await dialog.getByRole("button", { name: "Request time off", exact: true }).click();
  await expect(dialog.getByText("Type your full name to sign this request.")).toBeVisible();
  expect(calls.some(call => call.path === "/api/pto/requests" && call.method === "POST")).toBe(false);
  await dialog.getByLabel("Employee Signature", { exact: false }).fill("  Alex Worker  ");
  await dialog.getByRole("button", { name: "Request time off", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.find(call => call.path === "/api/pto/requests" && call.method === "POST")?.body).toMatchObject({
    requestUnit: "DAYS", hours: null, requestedHours: null, reasonCategory: "Bereavement", employeeSignature: "Alex Worker",
  });
  await page.getByRole("button", { name: "Request time off", exact: true }).click();
  await expect(dialog.getByLabel("Employee Signature", { exact: false })).toHaveValue("");
});

test("time-off: hourly requests use requested hours with an optional total on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const { calls, day } = await fixture(page, "EMPLOYEE");
  await page.goto("/pto");
  await page.getByRole("button", { name: "Request time off", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Request time off", exact: true });
  await dialog.getByRole("combobox", { name: "Leave type" }).click();
  await page.getByRole("option", { name: "Vacation", exact: true }).click();
  await dialog.getByRole("button", { name: "Hours", exact: true }).click();
  await dialog.getByLabel("Start date", { exact: false }).fill(day);
  await dialog.getByLabel("End date", { exact: false }).fill(day);
  await dialog.getByLabel("Hours requested", { exact: false }).fill("2.5");
  await dialog.getByRole("combobox", { name: "Reason for leave" }).click();
  await page.getByRole("option", { name: "Medical leave", exact: true }).click();
  await dialog.getByLabel("Employee Signature", { exact: false }).fill("Alex Worker");
  await expect(dialog.getByText("2.5 total hours requested")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("time-off-request-mobile.png"), fullPage: true, animations: "disabled" });
  await dialog.getByRole("button", { name: "Request time off", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(calls.find(call => call.path === "/api/pto/requests" && call.method === "POST")?.body).toMatchObject({
    requestUnit: "HOURS", requestedHours: 2.5, hours: null, reasonCategory: "Medical leave", employeeSignature: "Alex Worker",
  });
});

for (const role of ["EMPLOYEE", "SUPERVISOR", "MANAGER", "ADMIN"] as const) {
  for (const appearance of ["light", "dark"] as const) {
    test(`overhaul preview: ${role} ${appearance} preserves screens and mobile reflow`, async ({ page }) => {
      await fixture(page, role);
      await page.emulateMedia({ colorScheme: appearance, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width: 1440, height: 1000 });
      const paths = ["dashboard", "pto", "attendance", "payroll", "schedule", "profile", ...(role === "ADMIN" ? ["employees", "accounts", "organization"] : []), ...(role === "ADMIN" || role === "MANAGER" ? ["onboarding"] : [])];
      for (const path of paths) {
        await page.goto(`/${path}`);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator("body")).toHaveCSS("color-scheme", appearance);
        await expect(page.getByRole("progressbar", { name: /loading|restoring/i })).toHaveCount(0);
        await expect(page.getByRole("alert").filter({ hasText: /failed|unavailable|try again/i })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`${path}-desktop.png`), fullPage: true, animations: "disabled" });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: test.info().outputPath(`${path}-mobile.png`), fullPage: true, animations: "disabled" });
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      expect(errors).toEqual([]);
    });
  }
}

test("appearance follows system, persists a manual choice, and resumes system changes", async ({ page }) => {
  await fixture(page, "MANAGER");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/dashboard");
  await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: "Change appearance" }).click();
  await page.getByRole("menuitem", { name: "Light", exact: true }).click();
  await expect(page.locator("body")).toHaveCSS("color-scheme", "light");
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("color-scheme", "light");
  await page.getByRole("button", { name: "Change appearance" }).click();
  await page.getByRole("menuitem", { name: "System", exact: true }).click();
  await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("color-scheme", "light");
});

test("public sign-in and onboarding preview support both themes without overflow", async ({ page }) => {
  await page.route(url => url.pathname.startsWith("/api/"), route => route.fulfill({ status: 401, json: { message: "Sign in required" } }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const appearance of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: appearance, reducedMotion: "reduce" });
    for (const path of ["login", "onboarding-preview"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${path}`);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator("body")).toHaveCSS("color-scheme", appearance);
      await expect(page.getByRole("button", { name: "Change appearance" })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${path}-${appearance}-mobile.png`), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
