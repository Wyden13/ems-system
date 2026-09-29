import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ThemeProvider } from "@mui/material";
import App from "./App";
import theme from "./theme";
it("restores a session and redirects non-admin management routes to profile", async () => {
  window.history.replaceState(null, "", "/accounts");
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) => {
      const path = String(input);
      const body = path.endsWith("/csrf")
        ? { token: "csrf", headerName: "X-XSRF-TOKEN" }
        : path.endsWith("/refresh")
          ? { accessToken: "token" }
          : {
              id: "test-account",
              email: "employee@example.com",
              role: "EMPLOYEE",
              status: "ACTIVE",
            };
      return new Response(JSON.stringify(body), { status: 200 });
    });
  render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>,
  );
  expect(
    await screen.findByRole("heading", { name: "My Profile" }),
  ).toBeVisible();
  await waitFor(() => expect(window.location.pathname).toBe("/profile"));
  expect(
    screen.queryByRole("link", { name: "Accounts" }),
  ).not.toBeInTheDocument();
  expect(
    request.mock.calls.some(([path]) =>
      String(path).includes("/api/v1/admin/"),
    ),
  ).toBe(false);
});
