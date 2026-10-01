import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
const password = "IntegrationTest123!";
async function login(
  request: APIRequestContext,
  email: string,
  secret = password,
) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  return request.post("/api/v1/auth/login", {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password: secret },
  });
}
async function createAccount(request: APIRequestContext, suffix: string) {
  const session = await login(request, "admin@integration.test");
  expect(session.status()).toBe(200);
  const headers = {
    Authorization: `Bearer ${(await session.json()).accessToken}`,
  };
  const email = `profile-${suffix}-${Date.now()}@integration.test`;
  const created = await request.post("/api/v1/admin/accounts", {
    headers,
    data: { email, password, role: "EMPLOYEE" },
  });
  expect(created.status()).toBe(201);
  return { email, headers, account: await created.json() };
}
async function signIn(page: Page, email: string, secret = password) {
  await page.goto("/");
  await page.getByLabel(/^Email(?:\s*\*)?$/).fill(email);
  await page.getByLabel(/^Password(?:\s*\*)?$/).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My work", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My Profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
}
test("profile email and password changes persist and revoke old credentials", async ({
  page,
  request,
}) => {
  const { email } = await createAccount(request, "change");
  await signIn(page, email);
  const updatedEmail = `updated-${email}`;
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel(/^Email(?:\s*\*)?$/)
    .fill(updatedEmail);
  await page.getByRole("button", { name: "Change email", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByText(updatedEmail, { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page.getByLabel(/^Current password(?:\s*\*)?$/).fill(password);
  await page.getByLabel(/^New password(?:\s*\*)?$/).fill("UpdatedPassword123!");
  const changed = page.waitForResponse(
    (r) =>
      r.url().endsWith("/accounts/me/password") &&
      r.request().method() === "PATCH",
  );
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  const response = await changed;
  expect(response.status()).toBe(204);
  await expect(
    page.getByRole("heading", { name: "Sign in to EMS" }),
  ).toBeVisible();
  expect((await login(request, updatedEmail)).status()).toBe(401);
  await signIn(page, updatedEmail, "UpdatedPassword123!");
});
test("account suspension rejects login and revokes refresh sessions", async ({
  request,
}) => {
  const { email, headers, account } = await createAccount(request, "suspend");
  expect((await login(request, email)).status()).toBe(200);
  const suspended = await request.patch(
    `/api/v1/admin/accounts/${account.id}/status`,
    { headers, data: { status: "SUSPENDED" } },
  );
  expect(suspended.status()).toBe(200);
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  expect(
    (
      await request.post("/api/v1/auth/refresh", {
        headers: { [csrf.headerName]: csrf.token },
      })
    ).status(),
  ).toBe(401);
  expect((await login(request, email)).status()).toBe(401);
});
test("organization prevents duplicate names and deletion of referenced locations", async ({
  request,
}) => {
  const session = await login(request, "admin@integration.test");
  const headers = {
    Authorization: `Bearer ${(await session.json()).accessToken}`,
  };
  const name = `Reference ${Date.now()}`;
  const location = await request.post("/api/locations", {
    headers,
    data: { name },
  });
  expect(location.status()).toBe(201);
  const { id } = await location.json();
  expect(
    (
      await request.post("/api/locations", {
        headers,
        data: { name: name.toUpperCase() },
      })
    ).status(),
  ).toBe(409);
  const department = await request.post("/api/departments", {
    headers,
    data: { name, locationId: id },
  });
  expect(department.status()).toBe(201);
  const { id: departmentId } = await department.json();
  expect(
    (await request.delete(`/api/locations/${id}`, { headers })).status(),
  ).toBe(409);
  expect(
    (
      await request.post(`/api/departments/${departmentId}/archive`, {
        headers,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await request.delete(`/api/locations/${id}`, { headers })).status(),
  ).toBe(409);
  expect(
    (
      await request.post(`/api/departments/${departmentId}/restore`, {
        headers,
      })
    ).ok(),
  ).toBeTruthy();
});
