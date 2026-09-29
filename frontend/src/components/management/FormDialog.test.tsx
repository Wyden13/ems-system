import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import FormDialog from "./FormDialog";
import { ApiError } from "../../api/client";
it("preserves input and displays server validation before retrying a save", async () => {
  const user = userEvent.setup();
  const close = vi.fn();
  const save = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError(409, "Email already exists", {
        email: "Choose another email",
      }),
    )
    .mockResolvedValueOnce(undefined);
  render(
    <FormDialog
      title="Edit account"
      fields={[
        { name: "email", label: "Email", type: "email", required: true },
      ]}
      initial={{ email: "old@example.com" }}
      onClose={close}
      onSave={save}
    />,
  );
  await user.clear(screen.getByLabelText(/Email/));
  await user.type(screen.getByLabelText(/Email/), "new@example.com");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Choose another email")).toBeVisible();
  expect(screen.getByLabelText(/Email/)).toHaveValue("new@example.com");
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(save).toHaveBeenLastCalledWith({ email: "new@example.com" });
  expect(close).toHaveBeenCalledOnce();
});
