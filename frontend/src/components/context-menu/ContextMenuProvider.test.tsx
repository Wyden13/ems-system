import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ContextMenuProvider from "./ContextMenuProvider";
import { useObjectContextMenu, type ContextAction } from "./context";

function ObjectTarget({ actions }: { actions: ContextAction[] }) {
  const contextMenu = useObjectContextMenu();
  return (
    <div {...contextMenu("Employee", actions)}>
      <button type="button">Employee record</button>
      <input aria-label="Employee notes" />
    </div>
  );
}

describe("website context menu", () => {
  it("replaces the native menu with object actions without running them on right-click", async () => {
    const select = vi.fn();
    const refresh = vi.fn();
    render(
      <ContextMenuProvider
        actions={[{ label: "Refresh data", onSelect: refresh }]}
      >
        <ObjectTarget
          actions={[{ label: "Edit employee", onSelect: select }]}
        />
      </ContextMenuProvider>,
    );
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    });
    fireEvent(screen.getByRole("button", { name: "Employee record" }), event);
    expect(event.defaultPrevented).toBe(true);
    expect(
      screen.getByRole("menu", { name: "Employee actions" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("menuitem", { name: "Refresh data" }),
    ).not.toBeInTheDocument();
    expect(select).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("menuitem", { name: "Edit employee" }),
    );
    expect(select).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("opens with Shift+F10, skips disabled actions and restores focus on Escape", async () => {
    const disabled = vi.fn();
    render(
      <ContextMenuProvider actions={[]}>
        <ObjectTarget
          actions={[
            { label: "Change role", disabled: true, onSelect: disabled },
            { label: "View details", onSelect: vi.fn() },
          ]}
        />
      </ContextMenuProvider>,
    );
    const target = screen.getByRole("button", { name: "Employee record" });
    target.focus();
    const user = userEvent.setup();
    await user.keyboard("{Shift>}{F10}{/Shift}");
    expect(
      screen.getByRole("menuitem", { name: "View details" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("menuitem", { name: "Change role" }),
    ).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{ArrowUp}");
    expect(
      screen.getByRole("menuitem", { name: "View details" }),
    ).toHaveFocus();
    expect(disabled).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(target).toHaveFocus());
  });

  it("shows app controls on the background and dismisses on scroll or an outside click", async () => {
    render(
      <ContextMenuProvider
        actions={[{ label: "Refresh data", onSelect: vi.fn() }]}
      >
        <div data-testid="background">Schedule</div>
      </ContextMenuProvider>,
    );
    const background = screen.getByTestId("background");
    fireEvent.contextMenu(background, { clientX: 100, clientY: 100 });
    expect(
      screen.getByRole("menuitem", { name: "Refresh data" }),
    ).toBeVisible();
    fireEvent.scroll(document.documentElement);
    expect(
      screen.getByRole("menuitem", { name: "Refresh data" }),
    ).toBeVisible();
    Object.defineProperty(document.documentElement, "scrollTop", {
      configurable: true,
      value: 100,
    });
    fireEvent.scroll(document.documentElement);
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    fireEvent.contextMenu(background, { clientX: 200, clientY: 100 });
    fireEvent.pointerDown(background, { button: 0 });
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("keeps normal text-editing context menus inside fields", () => {
    render(
      <ContextMenuProvider
        actions={[{ label: "Refresh data", onSelect: vi.fn() }]}
      >
        <ObjectTarget
          actions={[{ label: "Edit employee", onSelect: vi.fn() }]}
        />
      </ContextMenuProvider>,
    );
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(screen.getByRole("textbox", { name: "Employee notes" }), event);
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
