import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import theme from "../theme";
import OnboardingPreviewPage from "./OnboardingPreviewPage";

function renderPreview() {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <OnboardingPreviewPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
  return userEvent.setup();
}

it("walks through setup, saved draft, correction, resubmission and approval without API calls or stored credentials", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const user = renderPreview();
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  await user.type(
    screen.getByLabelText("New password", { exact: false }),
    "DemoPassword123",
  );
  await user.type(
    screen.getByLabelText("Confirm password", { exact: false }),
    "DifferentPassword123",
  );
  await user.click(screen.getByRole("button", { name: "Set up demo account" }));
  expect(screen.getByText("Passwords must match.")).toBeVisible();
  await user.clear(screen.getByLabelText("Confirm password", { exact: false }));
  await user.type(
    screen.getByLabelText("Confirm password", { exact: false }),
    "DemoPassword123",
  );
  await user.click(screen.getByRole("button", { name: "Set up demo account" }));
  await user.type(
    screen.getByLabelText("Home address", { exact: false }),
    "123 Example Avenue",
  );
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await user.click(screen.getByRole("tab", { name: "Manager / admin view" }));
  expect(screen.getByText("Waiting for approval")).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  expect(screen.getByLabelText("Home address", { exact: false })).toHaveValue(
    "123 Example Avenue",
  );
  await user.click(screen.getByRole("button", { name: "Submit for approval" }));
  expect(
    screen.getByText(
      "Complete your name, phone, address and terms acceptance before submitting.",
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole("checkbox", {
      name: "I have read and accept the demo onboarding terms",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Submit for approval" }));
  await user.click(screen.getByRole("tab", { name: "Manager / admin view" }));
  await user.click(screen.getByRole("button", { name: "Request changes" }));
  expect(
    screen.getByText("Add feedback so the employee knows what to change."),
  ).toBeVisible();
  await user.type(
    screen.getByLabelText("Feedback for requested changes"),
    "Please add your unit number.",
  );
  await user.click(screen.getByRole("button", { name: "Request changes" }));
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  expect(
    screen.getByText("Changes requested: Please add your unit number."),
  ).toBeVisible();
  await user.type(
    screen.getByLabelText("Home address", { exact: false }),
    ", Unit 4",
  );
  await user.click(screen.getByRole("button", { name: "Submit for approval" }));
  await user.click(screen.getByRole("tab", { name: "Manager / admin view" }));
  expect(
    screen.getByText("Home address: 123 Example Avenue, Unit 4"),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Approve onboarding" }));
  expect(screen.getByText("Available in demo")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Cancel onboarding" }),
  ).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
}, 20000);

it("blocks expired and cancelled setup invitations and allows a seven-day resend", async () => {
  const user = renderPreview();
  await user.click(screen.getByRole("button", { name: "Simulate expiry" }));
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  expect(
    screen.getByText(
      "This setup invitation expired. Ask a manager or admin to resend it.",
    ),
  ).toBeVisible();
  expect(
    screen.queryByLabelText("New password", { exact: false }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Manager / admin view" }));
  await user.click(
    screen.getByRole("button", { name: "Resend demo invitation" }),
  );
  expect(
    screen.getByText("Demo invitation renewed for 7 days. No email was sent."),
  ).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  expect(screen.getByLabelText("New password", { exact: false })).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "Manager / admin view" }));
  await user.click(screen.getByRole("button", { name: "Cancel onboarding" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm cancellation" }),
  );
  await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
  await user.click(screen.getByRole("tab", { name: "Employee view" }));
  expect(
    screen.getByText(
      "This invitation was cancelled. Contact your hiring manager.",
    ),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Set up demo account" }),
  ).not.toBeInTheDocument();
});
