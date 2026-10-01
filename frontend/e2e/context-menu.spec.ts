import { test, expect } from "@playwright/test";

test("record menus paste new drafts without login links, enforce permissions and explain deletion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const mutations: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const account = {
    id: "admin",
    email: "admin@example.test",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "",
    updatedAt: "",
    lastLoginAt: null,
  };
  const employee = {
    id: 1,
    employeeNumber: "000001",
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex@example.test",
    departmentId: 1,
    role: "EMPLOYEE",
    userAccountId: "linked-account",
    hireDate: "2024-01-01",
    payRate: 25,
    jobTitle: "Technician",
    active: true,
  };
  const records = (content: unknown[]) => ({
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 20,
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== "GET" && !path.endsWith("/refresh"))
        mutations.push(path);
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me") data = account;
      else if (path === "/api/employees") data = records([employee]);
      else if (path === "/api/departments")
        data = [
          {
            id: 1,
            name: "Operations",
            locationId: 1,
            locationName: "Edmonton",
            archived: false,
          },
        ];
      else if (path === "/api/locations") data = [{ id: 1, name: "Edmonton" }];
      else if (path === "/api/v1/admin/accounts")
        data = records([
          account,
          {
            ...account,
            id: "other",
            email: "other@example.test",
            role: "EMPLOYEE",
          },
        ]);
      await route.fulfill({ json: data });
    },
  );
  await page.goto("/employees");
  const employeeRow = page
    .getByRole("row")
    .filter({ hasText: "alex@example.test" });
  await employeeRow.click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await employeeRow.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  const addEmployee = page.getByRole("dialog", {
    name: "Add employee",
    exact: true,
  });
  await expect(
    addEmployee.getByLabel("First name", { exact: false }),
  ).toHaveValue("Alex");
  await expect(
    addEmployee.getByLabel("Employee email", { exact: false }),
  ).toHaveValue("");
  await expect(
    addEmployee.getByRole("combobox", {
      name: "Linked login account",
      exact: true,
    }),
  ).toHaveValue("");
  await expect(addEmployee).toContainText("new number");
  await addEmployee
    .getByRole("button", { name: "Cancel", exact: true })
    .click();

  await page.getByRole("link", { name: "Accounts", exact: true }).click();
  const own = page
    .getByRole("row")
    .filter({
      has: page.getByRole("button", { name: account.email, exact: true }),
    });
  await own.click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  const other = page.getByRole("row").filter({ hasText: "other@example.test" });
  await other.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await other.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  const addAccount = page.getByRole("dialog", {
    name: "Add account",
    exact: true,
  });
  await expect(addAccount.getByLabel("Email", { exact: false })).toHaveValue(
    "",
  );
  await expect(
    addAccount.getByLabel("Initial password", { exact: false }),
  ).toHaveValue("");
  await expect(
    addAccount.getByRole("combobox", { name: "Access role", exact: true }),
  ).toContainText("Employee");
  await addAccount.getByRole("button", { name: "Cancel", exact: true }).click();
  await other.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit account", exact: true });
  await edit
    .getByRole("button", { name: "Change status", exact: true })
    .click();
  const status = page.getByRole("dialog", {
    name: "Change account status",
    exact: true,
  });
  await expect(status).toContainText("other@example.test");
  await status.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("link", { name: "Organization", exact: true }).click();
  const department = page.getByRole("row").filter({ hasText: "Operations" });
  await department.click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Paste", exact: true }),
  ).toBeDisabled();
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await page.getByRole("tab", { name: "Locations", exact: true }).click();
  const location = page.getByRole("row").filter({ hasText: "Edmonton" });
  await location.click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Paste", exact: true }),
  ).toBeDisabled();
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await location.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  const addLocation = page.getByRole("dialog", {
    name: "Add location",
    exact: true,
  });
  await expect(addLocation.getByLabel("Name", { exact: false })).toHaveValue(
    "Edmonton",
  );
  await addLocation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await location.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const remove = page.getByRole("dialog", {
    name: "Delete location",
    exact: true,
  });
  await expect(remove).toContainText("Edmonton");
  await remove.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
