import {
  createContext,
  useContext,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

export type ContextAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
  description?: string;
  restoreFocus?: boolean;
};
export type ContextMenuRequest = {
  title: string;
  actions: ContextAction[];
  position: { left: number; top: number };
  trigger: HTMLElement;
};

export const ContextMenuContext = createContext<
  ((request: ContextMenuRequest) => void) | null
>(null);

// Attach to the object itself so nested objects take precedence over their parent.
export function useObjectContextMenu() {
  const open = useContext(ContextMenuContext);
  return (title: string, actions: ContextAction[]) => ({
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      if (!open || isTextInput(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const keyboard = event.clientX === 0 && event.clientY === 0;
      open({
        title,
        actions,
        trigger: event.currentTarget,
        position: keyboard
          ? { left: rect.left, top: rect.bottom }
          : { left: event.clientX, top: event.clientY },
      });
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (
        !open ||
        isTextInput(event.target) ||
        !(
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        )
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const rect =
        event.target instanceof HTMLElement
          ? event.target.getBoundingClientRect()
          : event.currentTarget.getBoundingClientRect();
      open({
        title,
        actions,
        trigger:
          event.target instanceof HTMLElement
            ? event.target
            : event.currentTarget,
        position: { left: rect.left, top: rect.bottom },
      });
    },
  });
}

export function isTextInput(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
    )
  );
}
