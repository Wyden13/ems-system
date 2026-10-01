import { test, expect } from "@playwright/test";

test("employee job titles have a separate column and combine with paginated filters", async ({
  page,
}, testInfo) => {
  const account = {
    id: "admin",
    email: "admin@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    lastLoginAt: null,
  };
  const employees = Array.from({ length: 32 }, (_, index) => ({
    id: index + 1,
    employeeNumber: String(index + 1).padStart(6, "0"),
    firstName: index < 29 ? "Alex" : "Jamie",
    lastName: `Employee ${index + 1}`,
    email: `employee${index + 1}@example.test`,
    departmentId: index === 27 ? 2 : 1,
    role: "EMPLOYEE",
    hireDate: "2024-01-01",
    payRate: 25,
    jobTitle:
      index === 0 ? null : index === 26 ? "Coordinator" : "Senior Technician",
    active: index !== 28,
  }));
  const queries: URLSearchParams[] = [];
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const url = new URL(route.request().url());
      let data: unknown = [];
      if (url.pathname.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (url.pathname.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (url.pathname === "/api/v1/accounts/me") data = account;
      else if (url.pathname === "/api/departments")
        data = [
          { id: 1, name: "Operations", locationId: 1, archived: false },
          { id: 2, name: "Support", locationId: 1, archived: false },
        ];
      else if (url.pathname === "/api/employees") {
        queries.push(url.searchParams);
        const title = (url.searchParams.get("jobTitle") ?? "").toLowerCase();
        const search = (url.searchParams.get("search") ?? "").toLowerCase();
        const active = url.searchParams.get("active");
        const department = url.searchParams.get("departmentId");
        const number = Number(url.searchParams.get("page") ?? 0);
        const matches = employees.filter(
          (employee) =>
            (!title || employee.jobTitle?.toLowerCase().includes(title)) &&
            (!search ||
              `${employee.firstName} ${employee.lastName}`
                .toLowerCase()
                .includes(search)) &&
            (!active || String(employee.active) === active) &&
            (!department || String(employee.departmentId) === department),
        );
        data = {
          content: matches.slice(number * 20, (number + 1) * 20),
          totalElements: matches.length,
          totalPages: Math.ceil(matches.length / 20),
          number,
          size: 20,
        };
      }
      await route.fulfill({ json: data });
    },
  );
  await page.goto("/employees");
  await expect(
    page.getByRole("columnheader", { name: "Job title", exact: true }),
  ).toBeVisible();
  const first = page
    .getByRole("row")
    .filter({ hasText: "employee1@example.test" });
  await expect(first.getByRole("cell").nth(1)).toHaveText("Alex Employee 1");
  await expect(first.getByRole("cell").nth(2)).toHaveText("—");
  const second = page
    .getByRole("row")
    .filter({ hasText: "employee2@example.test" });
  await expect(second.getByRole("cell").nth(1)).toHaveText("Alex Employee 2");
  await expect(second.getByRole("cell").nth(2)).toHaveText("Senior Technician");
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page.getByText("21–32 of 32", { exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Job title filter" })
    .fill("  technician  ");
  await expect(page.getByText("1–20 of 30", { exact: true })).toBeVisible();
  expect(queries.at(-1)?.get("jobTitle")).toBe("technician");
  expect(queries.at(-1)?.get("page")).toBe("0");
  await page.getByRole("textbox", { name: "Search employees" }).fill("Alex");
  await page.getByRole("combobox", { name: "Status", exact: true }).click();
  await page.getByRole("option", { name: "Active", exact: true }).click();
  await page.getByRole("combobox", { name: "Department filter" }).click();
  await page.getByRole("option", { name: "Operations", exact: true }).click();
  await expect(page.getByText("1–20 of 25", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page.getByText("21–25 of 25", { exact: true })).toBeVisible();
  expect(Object.fromEntries(queries.at(-1)!)).toMatchObject({
    jobTitle: "technician",
    search: "Alex",
    active: "true",
    departmentId: "1",
    page: "1",
  });
  await page
    .getByRole("textbox", { name: "Job title filter" })
    .fill("nonexistent");
  await expect(
    page.getByText("No employees match your filters."),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "No employees match your filters." }),
  ).toHaveAttribute("colspan", "7");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("textbox", { name: "Job title filter" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Search employees" }),
  ).toHaveValue("");
  await expect(page.getByText("1–20 of 32", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Status", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "All statuses", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Department filter" }).click();
  await expect(
    page.getByRole("option", { name: "All departments", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Clear filters" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Updating employees…")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath(`ems-employees-${testInfo.project.name}.png`),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("textbox", { name: "Job title filter" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath(`ems-employees-mobile-${testInfo.project.name}.png`),
  });
});
