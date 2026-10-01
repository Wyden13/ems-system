import { test, expect, type Page } from "@playwright/test";
import type { Role } from "../src/api/types";

async function fixture(page: Page, role: Role) {
  const people = [
    {
      id: 1,
      name: "Morgan Manager",
      employeeNumber: "000001",
      departmentId: 1,
      active: true,
      self: true,
    },
    {
      id: 2,
      name: "Alex Worker",
      employeeNumber: "000002",
      departmentId: 1,
      active: true,
      self: false,
    },
  ];
  let available = 16;
  const deductions: Record<string, unknown>[] = [];
  const ledger: Record<string, unknown>[] = [];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me")
        data = {
          id: "current",
          email: "current@example.test",
          role,
          status: "ACTIVE",
          createdAt: "",
          updatedAt: "",
          lastLoginAt: null,
        };
      else if (path === "/api/pto/people") data = people;
      else if (path === "/api/pto/types")
        data = [{ id: 1, name: "Vacation", paid: true }];
      else if (path === "/api/pto/balances/deduct") {
        const body = request.postDataJSON();
        deductions.push(body);
        if (body.hours > available) {
          await route.fulfill({
            status: 409,
            json: {
              message:
                "Adjustment would reduce the balance below reserved and used hours",
            },
          });
          return;
        }
        available -= body.hours;
        ledger.push({
          id: 1,
          ptoTypeName: "Vacation",
          hoursDelta: -body.hours,
          entryType: "DEDUCTION",
          reason: body.reason,
        });
      } else if (path.startsWith("/api/pto/balances/employees/")) {
        const own = path.endsWith("/1");
        data = [
          {
            id: 1,
            ptoTypeId: 1,
            ptoTypeName: "Vacation",
            accruedHours: own ? 8 : available + 8,
            availableHours: own ? 8 : available,
            reservedHours: own ? 0 : 8,
            usedHours: 0,
          },
        ];
      } else if (path === "/api/pto/ledger/2") data = ledger;
      await route.fulfill({ json: data });
    },
  );
  return deductions;
}

for (const role of ["MANAGER", "ADMIN"] as const) {
  test(`${role}: manual PTO deduction previews the selected balance and records a required reason`, async ({
    page,
  }, testInfo) => {
    const deductions = await fixture(page, role);
    await page.goto("/pto");
    await page.getByRole("button", { name: "Deduct PTO", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Deduct PTO",
      exact: true,
    });
    await dialog
      .getByRole("combobox", { name: "Employee", exact: false })
      .click();
    await page
      .getByRole("option", { name: "Alex Worker", exact: true })
      .click();
    await dialog
      .getByRole("combobox", { name: "Leave type", exact: false })
      .click();
    await page.getByRole("option", { name: "Vacation", exact: true }).click();
    await dialog.getByLabel("Hours to deduct", { exact: false }).fill("4");
    await expect(
      dialog.getByText("Available PTO: 16 hours · After deduction: 12 hours", {
        exact: true,
      }),
    ).toBeVisible();
    await dialog.getByLabel("Deduction reason", { exact: false }).fill("   ");
    await dialog
      .getByRole("button", { name: "Deduct PTO", exact: true })
      .click();
    await expect(
      dialog.getByText("Enter a reason for this deduction.", { exact: true }),
    ).toBeVisible();
    expect(deductions).toHaveLength(0);
    await dialog
      .getByLabel("Deduction reason", { exact: false })
      .fill("Manual correction");
    await dialog.getByLabel("Hours to deduct", { exact: false }).fill("20");
    await expect(
      dialog.getByText(/The deduction exceeds the available PTO/),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Deduct PTO", exact: true })
      .click();
    await expect(
      dialog.getByText(
        "Adjustment would reduce the balance below reserved and used hours",
        { exact: true },
      ),
    ).toBeVisible();
    await dialog.getByLabel("Hours to deduct", { exact: false }).fill("4");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: test.info().outputPath(`ems-pto-deduction-${role}-${testInfo.project.name}.png`),
    });
    await dialog
      .getByRole("button", { name: "Deduct PTO", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    expect(deductions).toHaveLength(2);
    expect(deductions[1]).toMatchObject({
      employeeId: 2,
      ptoTypeId: 1,
      hours: 4,
      reason: "Manual correction",
    });
    expect(deductions[1].requestKey).toBe(deductions[0].requestKey);
    await expect(
      page.getByRole("heading", { name: "PTO balances — Alex Worker" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Vacation: 12 available · 8 reserved · 0 used · 20 allocated hours",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText("Vacation: -4 hours · DEDUCTION · Manual correction", {
        exact: true,
      }),
    ).toBeVisible();
  });
}

for (const role of ["EMPLOYEE", "SUPERVISOR"] as const) {
  test(`${role}: manual PTO deduction is hidden`, async ({ page }) => {
    await fixture(page, role);
    await page.goto("/pto");
    await expect(
      page.getByRole("button", { name: "Request time off", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Deduct PTO", exact: true }),
    ).toHaveCount(0);
  });
}
