import { test, expect } from "@playwright/test";

test("dashboard cards highlight request dates, shift times and staffing at desktop and mobile sizes", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-01T18:00:00Z") });
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me")
        data = {
          id: "account",
          email: "manager@example.test",
          role: "MANAGER",
          status: "ACTIVE",
        };
      else if (path === "/api/time-entries/state")
        data = {
          serverTime: "2026-10-01T18:00:00Z",
          employeeId: 1,
          active: null,
          todaySeconds: 0,
        };
      else if (path === "/api/time-entries/current")
        data = { serverTime: "2026-10-01T18:00:00Z", employees: [] };
      else if (path === "/api/timesheets/summary")
        data = { pendingApproval: 0 };
      else if (path === "/api/payroll/estimates") data = { estimates: [] };
      else if (path === "/api/pto/requests")
        data = [
          {
            id: 1,
            employeeId: 1,
            ptoTypeId: 1,
            ptoTypeName: "Demo vacation",
            startDate: "2026-10-16",
            endDate: "2026-12-10",
            hours: 80,
            requestUnit: "DAYS",
            requestedAmount: 10,
            status: "PENDING",
            version: 0,
            operationError: null,
            comment: null,
          },
        ];
      else if (path === "/api/shifts")
        data = [
          {
            id: 1,
            categoryName: "Morning",
            startsAt: "2026-10-01T07:00:00-06:00",
            endsAt: "2026-10-01T15:30:00-06:00",
            status: "DRAFT",
            requiredEmployees: 2,
            assignments: [],
          },
          {
            id: 2,
            categoryName: "Morning",
            startsAt: "2026-10-02T07:00:00-06:00",
            endsAt: "2026-10-02T15:00:00-06:00",
            status: "PUBLISHED",
            requiredEmployees: 1,
            assignments: [{ id: 1, employeeId: 1, status: "ACCEPTED" }],
          },
          {
            id: 3,
            categoryName: "Night",
            startsAt: "2026-10-03T22:00:00-06:00",
            endsAt: "2026-10-04T06:00:00-06:00",
            status: "DRAFT",
            requiredEmployees: 1,
            assignments: [],
          },
        ];
      await route.fulfill({ json: data });
    },
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/dashboard");
  const leave = page.getByRole("region", { name: "Time-off review" });
  const schedule = page.getByRole("region", { name: "Staffing and schedule" });
  await expect(leave.getByRole("article")).toHaveCount(1);
  await expect(leave).toContainText("Oct 16 – Dec 10, 2026");
  await expect(leave).toContainText("10 days requested");
  await expect(
    leave.getByRole("link", { name: "Review time off" }),
  ).toHaveAttribute("href", "/pto?status=PENDING");
  await expect(schedule.getByRole("article")).toHaveCount(3);
  await expect(schedule).toContainText("7 AM – 3:30 PM MT");
  await expect(schedule).toContainText("Oct 3 – 4, 2026");
  await expect(schedule).toContainText("Overnight");
  await expect(schedule).toContainText("2 open spots");
  await expect(schedule).toContainText("Fully staffed");
  await page.screenshot({
    path: test.info().outputPath("dashboard-cards-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(leave).toBeVisible();
  await expect(schedule).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("dashboard-cards-mobile.png"),
    fullPage: true,
  });
});
