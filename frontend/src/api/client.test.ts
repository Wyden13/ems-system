import { beforeEach, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  clearSession,
  login,
  refreshSession,
  logout,
} from "./client";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  clearSession(false);
});
it("uses CSRF and cookies without putting refresh tokens in browser storage", async () => {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(json({ token: "csrf", headerName: "X-XSRF-TOKEN" }))
    .mockResolvedValueOnce(json({ accessToken: "access" }))
    .mockResolvedValueOnce(json({ id: 1 }));
  await login("admin@example.com", "Password123!");
  expect(request.mock.calls[1][1]).toMatchObject({
    credentials: "same-origin",
    headers: { "X-XSRF-TOKEN": "csrf" },
  });
  await api("/api/employees");
  expect(
    new Headers(request.mock.calls[2][1]?.headers).get("Authorization"),
  ).toBe("Bearer access");
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it("coalesces simultaneous refreshes", async () => {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(json({ token: "csrf", headerName: "X-XSRF-TOKEN" }))
    .mockResolvedValueOnce(json({ accessToken: "new" }));
  await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
  expect(request).toHaveBeenCalledTimes(2);
});
it("retries unauthorized requests once and ends the session on a second 401", async () => {
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(json({ token: "csrf", headerName: "X-XSRF-TOKEN" }))
    .mockResolvedValueOnce(json({ accessToken: "new" }))
    .mockResolvedValueOnce(json({}, 401));
  await expect(api("/api/employees")).rejects.toMatchObject({ status: 401 });
  expect(request).toHaveBeenCalledTimes(4);
});
it("preserves field errors and does not retry a forbidden mutation", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    json(
      {
        message: "Choose a department",
        errors: [{ field: "departmentId", message: "Archived" }],
      },
      403,
    ),
  );
  await expect(
    api("/api/employees", { method: "POST", body: "{}" }),
  ).rejects.toEqual(
    expect.objectContaining({
      status: 403,
      fields: { departmentId: "Archived" },
    }),
  );
  expect(request).toHaveBeenCalledTimes(1);
});
it("does not report successful logout when the server cannot revoke the session", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(json({ token: "csrf", headerName: "X-XSRF-TOKEN" }))
    .mockResolvedValueOnce(json({ message: "Unavailable" }, 503));
  await expect(logout()).rejects.toBeInstanceOf(ApiError);
});
