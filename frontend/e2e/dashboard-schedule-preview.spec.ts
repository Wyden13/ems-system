import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Shift } from "../src/api/workflows";

async function fixture(page: Page, role = "MANAGER") {
  let clockedIn = true;
  let currentError = false;
  const calls: string[] = [];
  const people = [
    {
      id: 1,
      name: "Alex Morgan",
      employeeNumber: "000001",
      departmentId: 1,
      active: true,
      self: role === "EMPLOYEE",
    },
    {
      id: 2,
      name: "=SUM(1,1)",
      employeeNumber: "000002",
      departmentId: 1,
      active: true,
      self: role !== "EMPLOYEE",
    },
  ];
  const shift: Shift = {
    id: 1,
    shiftCategoryId: 1,
    categoryName: 'Night & "special"',
    departmentId: 1,
    locationId: 1,
    startsAt: "2026-09-28T22:00:00-06:00",
    endsAt: "2026-09-29T06:00:00-06:00",
    requiredEmployees: 2,
    status: "PUBLISHED",
    version: 0,
    assignments: [{ id: 1, employeeId: 1, status: "ACCEPTED", version: 0 }],
  };
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      calls.push(path);
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me")
        data = {
          id: "account",
          email: "current@example.test",
          role,
          status: "ACTIVE",
        };
      else if (path === "/api/employees/summary")
        data = { total: 2, active: 2, inactive: 0 };
      else if (path === "/api/time-entries/state")
        data = {
          serverTime: "2026-09-28T18:00:00Z",
          employeeId: 1,
          active: null,
          todaySeconds: 0,
        };
      else if (path === "/api/time-entries/current") {
        if (currentError) {
          await route.fulfill({
            status: 503,
            json: { message: "Current attendance unavailable. Try again." },
          });
          return;
        }
        data = {
          serverTime: "2026-09-28T18:00:00Z",
          employees: clockedIn
            ? [
                {
                  entryId: 7,
                  employeeId: 1,
                  name: "Alex Morgan",
                  employeeNumber: "000001",
                  clockIn: "2026-09-28T15:00:00Z",
                },
              ]
            : [],
        };
      } else if (path === "/api/timesheets/summary")
        data = { pendingApproval: 0 };
      else if (path === "/api/shifts/options")
        data = {
          people: role === "EMPLOYEE" ? [people[0]] : people,
          departments: [
            {
              id: 1,
              name: "Operations",
              locationId: 1,
              locationName: "Edmonton",
              archived: false,
            },
          ],
        };
      else if (path === "/api/shifts")
        data = [shift, { ...shift, id: 2, status: "CANCELLED" }];
      else if (path === "/api/shift-categories")
        data = [
          {
            id: 1,
            name: shift.categoryName,
            color: "#5B4BE1",
            defaultStartTime: "22:00",
            defaultEndTime: "06:00",
            active: true,
          },
        ];
      else if (path === "/api/payroll/estimates") data = { estimates: [] };
      await route.fulfill({ json: data });
    },
  );
  return {
    calls,
    clockOut: () => {
      clockedIn = false;
    },
    fail: () => {
      currentError = true;
    },
    recover: () => {
      currentError = false;
    },
  };
}

for (const role of ["MANAGER", "ADMIN", "SUPERVISOR"]) {
  test(`${role}: current employees update after clock-out and recover from errors`, async ({
    page,
  }, testInfo) => {
    await page.clock.install({ time: new Date("2026-09-28T18:00:00Z") });
    const state = await fixture(page, role);
    await page.goto("/dashboard");
    const table = page.getByRole("table", {
      name: "Current employees",
      exact: true,
    });
    await expect(
      table.getByRole("row").filter({ hasText: "Alex Morgan" }),
    ).toContainText("3:00");
    await expect(page.getByText("1 clocked in", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `/private/tmp/ems-current-employees-${role}-${testInfo.project.name}.png`,
      animations: "disabled",
    });
    if (role === "SUPERVISOR")
      await expect(
        page.getByText(/Employees currently clocked in in your department/),
      ).toBeVisible();
    state.clockOut();
    await page.clock.fastForward(16000);
    await expect(table).toContainText("No employees are currently clocked in.");
    await expect(page.getByText("0 clocked in", { exact: true })).toBeVisible();
    state.fail();
    await page
      .getByRole("button", { name: "Refresh current employees" })
      .click();
    await expect(
      page.getByText("Current attendance unavailable. Try again."),
    ).toBeVisible();
    state.recover();
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      page.getByText("Current attendance unavailable. Try again."),
    ).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("employee dashboard preserves personal attendance access", async ({
  page,
}) => {
  const state = await fixture(page, "EMPLOYEE");
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Clock In", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current employees", exact: true }),
  ).toHaveCount(0);
  expect(state.calls).not.toContain("/api/time-entries/current");
});

test("schedule roster preview downloads CSV and a valid Excel workbook matching the selected range", async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/schedule?from=2026-09-26");
  await page
    .getByRole("button", { name: "Preview schedule", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Schedule preview",
    exact: true,
  });
  const table = dialog.getByRole("table", {
    name: "Schedule preview roster",
    exact: true,
  });
  await expect(table.getByRole("columnheader")).toHaveCount(11);
  const alex = table.getByRole("row").filter({ hasText: "Alex Morgan" });
  await expect(alex.getByRole("cell").nth(5)).toContainText("22:00–24:00");
  await expect(alex.getByRole("cell").nth(6)).toContainText("00:00–06:00");
  await expect(alex.getByRole("cell").last()).toHaveText("8");
  await expect(
    table.getByRole("row").filter({ hasText: "Open coverage" }),
  ).toContainText("1 open");
  await expect(table).not.toContainText("Cancelled");
  await page.screenshot({
    path: `/private/tmp/ems-schedule-preview-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  const csvPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export CSV", exact: true }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("schedule-2026-09-26-to-2026-10-02.csv");
  const csvPath = `/private/tmp/ems-schedule-preview-${testInfo.project.name}.csv`;
  await csv.saveAs(csvPath);
  const text = readFileSync(csvPath, "utf8");
  expect(text).toContain('"\'=SUM(1,1)"');
  expect(text).toContain('Night & ""special""');
  const excelPromise = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Export Excel", exact: true })
    .click();
  const excel = await excelPromise;
  expect(excel.suggestedFilename()).toBe(
    "schedule-2026-09-26-to-2026-10-02.xlsx",
  );
  const excelPath = `/private/tmp/ems-schedule-preview-${testInfo.project.name}.xlsx`;
  await excel.saveAs(excelPath);
  const parsed = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        `import json,zipfile,xml.etree.ElementTree as E,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for path in z.namelist(): E.fromstring(z.read(path))
 root=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 cells=root.findall('.//s:c',ns)
 assert not root.findall('.//s:f',ns)
 print(json.dumps({c.attrib['r']: ''.join(c.itertext()) for c in cells}))`,
        excelPath,
      ],
      { encoding: "utf8" },
    ),
  );
  expect(Object.values(parsed)).toContain("000001");
  expect(Object.values(parsed)).toContain("=SUM(1,1)");
  expect(Object.values(parsed)).toContain(
    'Night & "special" · 22:00–24:00 · Edmonton · Published',
  );
  expect(Object.values(parsed)).toContain("Open coverage");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("button", { name: "Export Excel", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Close preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Preview schedule", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview schedule", exact: true })
    .click();
  await expect(dialog.getByRole("columnheader")).toHaveCount(18);
  await expect(dialog).toContainText("2026-09-26 – 2026-10-09");
});

test("employee schedule preview exports only the accessible personal roster", async ({
  page,
}) => {
  await fixture(page, "EMPLOYEE");
  await page.goto("/schedule?from=2026-09-26");
  await page
    .getByRole("button", { name: "Preview schedule", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Schedule preview",
    exact: true,
  });
  await expect(dialog).toContainText("Alex Morgan");
  await expect(dialog).not.toContainText("=SUM(1,1)");
  await expect(dialog).not.toContainText("Open coverage");
});
