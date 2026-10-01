import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ContextMenuProvider from "./ContextMenuProvider";
import ObjectControlsProvider from "./ObjectControlsProvider";
import { useObjectContextMenu } from "./context";
import { useObjectControls } from "./objectControls";

function Targets({
  paste,
  remove,
}: {
  paste: (values: Record<string, string>) => void;
  remove: () => void;
}) {
  const { objectActions, pasteAction } = useObjectControls();
  const menu = useObjectContextMenu();
  return (
    <>
      <button
        {...menu(
          "Availability",
          objectActions({
            copy: {
              kind: "availability",
              label: "Monday availability",
              values: {
                dayOfWeek: "MONDAY",
                startTime: "09:00",
                endTime: "17:00",
                type: "AVAILABLE",
              },
            },
            paste: { kind: "availability", onPaste: paste },
            delete: remove,
            edit: vi.fn(),
          }),
        )}
      >
        Availability
      </button>
      <button
        {...menu("Shift day", [pasteAction({ kind: "shift", onPaste: paste })])}
      >
        Shift day
      </button>
      <button
        {...menu("Availability day", [
          pasteAction({ kind: "availability", onPaste: paste }),
        ])}
      >
        Availability day
      </button>
    </>
  );
}

it("enables Paste only for matching copied objects, keeps drafts separate and shows Details", async () => {
  const paste = vi.fn();
  const remove = vi.fn();
  render(
    <ObjectControlsProvider routeKey="schedule">
      <ContextMenuProvider actions={[]}>
        <Targets paste={paste} remove={remove} />
      </ContextMenuProvider>
    </ObjectControlsProvider>,
  );
  const record = screen.getByRole("button", { name: "Availability" });
  const shiftDay = screen.getByRole("button", { name: "Shift day" });
  const availabilityDay = screen.getByRole("button", {
    name: "Availability day",
  });
  const user = userEvent.setup();
  fireEvent.contextMenu(record, { clientX: 100, clientY: 100 });
  expect(
    screen
      .getAllByRole("menuitem")
      .map((item) => item.getAttribute("aria-label")),
  ).toEqual(["Copy", "Paste", "Delete", "Edit", "Details"]);
  expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await user.click(screen.getByRole("menuitem", { name: "Copy" }));
  fireEvent.contextMenu(shiftDay, { clientX: 100, clientY: 100 });
  expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
  fireEvent.contextMenu(availabilityDay, { clientX: 100, clientY: 100 });
  await user.click(screen.getByRole("menuitem", { name: "Paste" }));
  expect(paste).toHaveBeenCalledWith({
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "17:00",
    type: "AVAILABLE",
  });
  expect(remove).not.toHaveBeenCalled();
  paste.mock.calls[0][0].startTime = "12:00";
  fireEvent.contextMenu(availabilityDay, { clientX: 100, clientY: 100 });
  await user.click(screen.getByRole("menuitem", { name: "Paste" }));
  expect(paste.mock.calls[1][0].startTime).toBe("09:00");
  fireEvent.contextMenu(record, { clientX: 100, clientY: 100 });
  await user.click(screen.getByRole("menuitem", { name: "Details" }));
  expect(
    screen.getByRole("dialog", { name: "Monday availability details" }),
  ).toHaveTextContent("09:00");
});

it("clears the clipboard when the signed-in identity changes", async () => {
  const paste = vi.fn();
  const remove = vi.fn();
  const content = (account: string) => (
    <ObjectControlsProvider key={account} routeKey="schedule">
      <ContextMenuProvider actions={[]}>
        <Targets paste={paste} remove={remove} />
      </ContextMenuProvider>
    </ObjectControlsProvider>
  );
  const { rerender } = render(content("first-account"));
  fireEvent.contextMenu(screen.getByRole("button", { name: "Availability" }), {
    clientX: 100,
    clientY: 100,
  });
  await userEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
  rerender(content("second-account"));
  fireEvent.contextMenu(
    screen.getByRole("button", { name: "Availability day" }),
    { clientX: 100, clientY: 100 },
  );
  expect(screen.getByRole("menuitem", { name: "Paste" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  expect(paste).not.toHaveBeenCalled();
});
