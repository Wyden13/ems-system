import { test, expect, type APIRequestContext } from "@playwright/test";
const adminEmail = "admin@integration.test";
const password = "IntegrationTest123!";
async function loginApi(request: APIRequestContext, email = adminEmail) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  const response = await request.post("/api/v1/auth/login", {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  });
  expect(response.status()).toBe(200);
  const session = await response.json();
  expect(session.refreshToken).toBeUndefined();
  return session.accessToken as string;
}
test("admin manages real records; archive preserves references and logout ends refresh", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const office = `Office ${suffix}`;
  const department = `Department ${suffix}`;
  const employeeEmail = `employee-${suffix}@integration.test`;
  await page.goto("/");
  await page.getByLabel(/^Email(?:\s*\*)?$/).fill(adminEmail);
  await page.getByLabel(/^Password(?:\s*\*)?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workforce overview" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workforce overview" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Organization", exact: true }).click();
  await page.getByRole("tab", { name: "Locations", exact: true }).click();
  await page.getByRole("button", { name: "Add location", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/^Name(?:\s*\*)?$/)
    .fill(office);
  await page
    .getByRole("button", { name: "Create location", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("tab", { name: "Departments", exact: true }).click();
  await page
    .getByRole("button", { name: "Add department", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel(/^Name(?:\s*\*)?$/)
    .fill(department);
  await page.getByRole("combobox", { name: "Location", exact: true }).click();
  await page.getByRole("option", { name: office, exact: true }).click();
  await page
    .getByRole("button", { name: "Create department", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Accounts", exact: true }).click();
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/^Email(?:\s*\*)?$/)
    .fill(employeeEmail);
  await page.getByLabel(/^Initial password(?:\s*\*)?$/).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/Employee number is assigned automatically/),
  ).toBeVisible();
  await dialog.getByLabel(/^First name(?:\s*\*)?$/).fill("Integration");
  await dialog.getByLabel(/^Last name(?:\s*\*)?$/).fill("Employee");
  await dialog.getByLabel(/^Employee email(?:\s*\*)?$/).fill(employeeEmail);
  await dialog
    .getByRole("combobox", { name: "Department", exact: true })
    .click();
  await page.getByRole("option", { name: department, exact: true }).click();
  await dialog.getByLabel(/^Hire date(?:\s*\*)?$/).fill("2024-01-01");
  await dialog.getByLabel(/^Hourly pay \(CAD\)(?:\s*\*)?$/).fill("25.50");
  await dialog
    .getByRole("combobox", { name: "Linked login account", exact: true })
    .fill(employeeEmail);
  await page
    .getByRole("option", {
      name: `${employeeEmail} (Employee, Active)`,
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Create employee", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByLabel("Search employees", { exact: true })
    .fill(employeeEmail);
  const row = page.getByRole("row").filter({ hasText: employeeEmail });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").first()).toHaveText(/^\d{6}$/);
  const employeeNumber = await row.getByRole("cell").first().innerText();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    dialog.getByText(`Employee number: ${employeeNumber}`),
  ).toBeVisible();
  await dialog.getByLabel(/^Job title(?:\s*\*)?$/).fill("Updated technician");
  await dialog
    .getByRole("button", { name: "Save employee", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Updated technician");
  await expect(row.getByRole("cell").first()).toHaveText(employeeNumber);
  await row.getByRole("button", { name: "Deactivate", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Deactivate employee", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText("Inactive");
  await page.getByRole("link", { name: "Organization", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: department })
    .getByRole("button", { name: "Archive", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Archive department", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await page
    .getByLabel("Search employees", { exact: true })
    .fill(employeeEmail);
  await expect(
    page.getByRole("row").filter({ hasText: employeeEmail }),
  ).toContainText(department);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to EMS" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to EMS" }),
  ).toBeVisible();
  // Employee deactivation is deliberately independent of account login status.
  await page.getByLabel(/^Email(?:\s*\*)?$/).fill(employeeEmail);
  await page.getByLabel(/^Password(?:\s*\*)?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My work", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Employees", exact: true }),
  ).toHaveCount(0);
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
  const token = await loginApi(request, employeeEmail);
  for (const url of [
    "http://localhost:18082/api/employees",
    "http://localhost:18082/api/departments",
  ])
    expect(
      (
        await request.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status(),
    ).toBe(403);
});
test("gateway and services reject spoofed identity, invalid tokens, CSRF, and invalid references", async ({
  request,
}) => {
  for (const url of [
    "/api/employees",
    "http://localhost:18082/api/employees",
    "http://localhost:18082/api/locations",
  ]) {
    expect(
      (
        await request.get(url, { headers: { "X-User-Role": "ADMIN" } })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.get(url, { headers: { Authorization: "Bearer invalid" } })
      ).status(),
    ).toBe(401);
  }
  expect(
    (
      await request.post("/api/v1/auth/login", {
        data: { email: adminEmail, password },
      })
    ).status(),
  ).toBe(403);
  const token = await loginApi(request);
  const headers = { Authorization: `Bearer ${token}` };
  const response = await request.post("/api/employees", {
    headers,
    data: {
      firstName: "Missing",
      lastName: "Department",
      email: `missing-${Date.now()}@integration.test`,
      departmentId: 999999999,
      role: "EMPLOYEE",
      hireDate: "2024-01-01",
      payRate: 20,
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).errors[0].field).toBe("departmentId");
});
