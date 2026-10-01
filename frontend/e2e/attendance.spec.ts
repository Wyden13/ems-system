import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  currentPeriod,
  zonedInput,
  addDays,
  businessDate,
  midnight,
} from "../src/api/attendance";
const password = "IntegrationTest123!";
async function token(request: APIRequestContext, email: string) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  const response = await request.post("/api/v1/auth/login", {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).accessToken as string;
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/^Email(?:\s*\*)?$/).fill(email);
  await page.getByLabel(/^Password(?:\s*\*)?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Attendance", exact: true }),
  ).toBeVisible();
}
test("clock, restore, review, correct, and calculate payroll with role isolation", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const suffix = Date.now();
  const admin = await token(request, "admin@integration.test");
  const headers = { Authorization: `Bearer ${admin}` };
  async function create(path: string, data: unknown) {
    const response = await request.post(path, { headers, data });
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }
  const location = await create("/api/locations", {
    name: `Attendance office ${suffix}`,
  });
  const department = await create("/api/departments", {
    name: `Attendance team ${suffix}`,
    locationId: location.id,
  });
  const otherDepartment = await create("/api/departments", {
    name: `Other team ${suffix}`,
    locationId: location.id,
  });
  async function worker(role: string, dept: number, label: string) {
    const email = `${label}-${suffix}@integration.test`;
    const account = await create("/api/v1/admin/accounts", {
      email,
      password,
      role,
    });
    const employee = await create("/api/employees", {
      firstName: label,
      lastName: "Attendance",
      email,
      hireDate: "2026-01-01",
      departmentId: dept,
      role,
      userAccountId: account.id,
      payRate: "20.00",
    });
    return { email, employee, account, token: await token(request, email) };
  }
  const employee = await worker("EMPLOYEE", department.id, "Worker");
  const supervisor = await worker("SUPERVISOR", department.id, "Supervisor");
  const manager = await worker("MANAGER", otherDepartment.id, "Manager");
  const outsider = await worker("EMPLOYEE", otherDepartment.id, "Outsider");
  const unlinkedEmail = `unlinked-${suffix}@integration.test`;
  await create("/api/v1/admin/accounts", {
    email: unlinkedEmail,
    password,
    role: "EMPLOYEE",
  });
  const unlinkedToken = await token(request, unlinkedEmail);
  const auth = (value: string) => ({ Authorization: `Bearer ${value}` });
  expect(
    (
      await request.get("/api/time-entries/state", {
        headers: { "X-User-Id": employee.account.id },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get("/api/time-entries/state", {
        headers: auth(unlinkedToken),
      })
    ).status(),
  ).toBe(404);
  await login(page, employee.email);
  await page.getByRole("link", { name: "Attendance", exact: true }).click();
  await expect(page.getByText("Schedule miss percentage:")).toContainText(
    "No completed shifts",
  );
  await page.getByRole("button", { name: "Clock In", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clock Out", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Clock Out", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Session duration")).not.toHaveText("0:00:00");
  await page.getByRole("button", { name: "Clock Out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clock In", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Awaiting approval", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toHaveCount(0);
  const entriesResponse = await request.get(
    `/api/time-entries?employeeId=${employee.employee.id}&from=${encodeURIComponent(midnight(addDays(businessDate(), -30)))}&to=${encodeURIComponent(midnight(addDays(businessDate(), 1)))}`,
    { headers: auth(employee.token) },
  );
  expect(entriesResponse.ok(), await entriesResponse.text()).toBeTruthy();
  const entry = (await entriesResponse.json())[0];
  const target = new Date(Date.now() - 2 * 86400000);
  const day = zonedInput(target.toISOString()).slice(0, 10);
  const offset = zonedInput(`${day}T18:00:00Z`).slice(-6);
  const start = new Date(`${day}T08:00:00${offset}`);
  const end = new Date(start.getTime() + 9 * 3600000);
  const period = currentPeriod(start);
  const correction = await request.post(
    `/api/time-entries/${entry.id}/adjust`,
    {
      headers: auth(manager.token),
      data: {
        version: entry.version,
        clockIn: start.toISOString(),
        clockOut: end.toISOString(),
        reason: "Verified nine hours",
      },
    },
  );
  expect(correction.ok(), await correction.text()).toBeTruthy();
  const changed = await correction.json();
  const ownPay = () =>
    request.get(`/api/payroll/estimates?periodStart=${period}`, {
      headers: auth(employee.token),
    });
  expect((await (await ownPay()).json()).estimates[0].approvedSeconds).toBe(0);
  expect(
    (
      await request.post(`/api/time-entries/${entry.id}/approve`, {
        headers: auth(supervisor.token),
        data: { version: changed.version },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`/api/time-entries/${entry.id}`, {
        headers: auth(outsider.token),
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get(`/api/time-entries/${entry.id}`, {
        headers: auth(supervisor.token),
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get(
        `/api/payroll/estimates?periodStart=${period}&employeeId=${employee.employee.id}`,
        { headers: auth(supervisor.token) },
      )
    ).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to EMS" }),
  ).toBeVisible();
  await login(page, manager.email);
  await page.getByRole("link", { name: "Attendance", exact: true }).click();
  await page.getByRole("combobox", { name: "Employee", exact: true }).click();
  await page
    .getByRole("option", {
      name: new RegExp(
        `Worker Attendance.*${employee.employee.employeeNumber}`,
      ),
    })
    .click();
  if (period !== currentPeriod())
    await page.getByRole("button", { name: "Previous pay period" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve attendance", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Approved", exact: true }),
  ).toBeVisible();
  const report = await (await ownPay()).json();
  expect(report.estimates).toHaveLength(1);
  expect(report.estimates[0].regularSeconds).toBe(8 * 3600);
  expect(report.estimates[0].overtimeSeconds).toBe(3600);
  expect(Number(report.estimates[0].grossPay)).toBe(190);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Verified nine hours");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Confirm audit and reset approval");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save correction", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Awaiting approval", exact: true }),
  ).toBeVisible();
  expect((await (await ownPay()).json()).estimates[0].approvedSeconds).toBe(0);
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve attendance", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Approved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to EMS" }),
  ).toBeVisible();
  await login(page, employee.email);
  await page.getByRole("link", { name: "Payroll", exact: true }).click();
  if (period !== currentPeriod())
    await page.getByRole("button", { name: "Previous pay period" }).click();
  await expect(
    page.getByRole("cell", { name: "$190.00", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Manager Attendance/ }),
  ).toHaveCount(0);
  const score = await request.get(
    `/api/timesheets/score?employeeId=${employee.employee.id}&from=${period}&to=${period}`,
    { headers: auth(employee.token) },
  );
  expect(await score.json()).toMatchObject({
    status: "AVAILABLE",
    expectedEvents: 0,
    missedEvents: 0,
    missPercentage: 0,
  });
  const deactivate = await request.post(
    `/api/employees/${employee.employee.id}/deactivate`,
    { headers },
  );
  expect(deactivate.ok()).toBeTruthy();
  expect(
    (
      await request.post("/api/time-entries/clock-in", {
        headers: auth(employee.token),
        data: { requestId: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
});
