import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import {
  ContextMenuContext,
  isTextInput,
  type ContextAction,
  type ContextMenuRequest,
} from "./context";

export default function ContextMenuProvider({
  children,
  title = "EMS controls",
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions: ContextAction[];
}) {
  const [menu, setMenu] = useState<ContextMenuRequest | null>(null);
  const id = useId();
  const trigger = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);
  const scrollPositions = useRef(
    new Map<Element, { left: number; top: number }>(),
  );
  const open = (request: ContextMenuRequest) => {
    trigger.current = request.trigger;
    restoreFocus.current = false;
    scrollPositions.current.clear();
    for (
      let element: Element | null = request.trigger;
      element;
      element = element.parentElement
    ) {
      scrollPositions.current.set(element, {
        left: element.scrollLeft,
        top: element.scrollTop,
      });
    }
    setMenu({
      ...request,
      actions: request.actions.length ? request.actions : actions,
    });
  };
  const close = (restore = false) => {
    restoreFocus.current = restore;
    setMenu(null);
  };

  useEffect(() => {
    if (!menu) return;
    const dismiss = () => setMenu(null);
    // A menu must not stay attached to an object that has scrolled away.
    const scroll = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("#ems-context-menu")
      )
        return;
      const element =
        event.target instanceof Element
          ? event.target
          : document.scrollingElement;
      const before = element && scrollPositions.current.get(element);
      // Browsers can deliver the click's scroll-into-view event after the menu opens.
      if (
        element &&
        before &&
        (element.scrollLeft !== before.left || element.scrollTop !== before.top)
      )
        dismiss();
    };
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    const pointer = (event: PointerEvent) => {
      if (
        event.button !== 2 &&
        event.target instanceof Element &&
        !event.target.closest("#ems-context-menu")
      )
        dismiss();
    };
    document.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
      document.removeEventListener("pointerdown", pointer);
    };
  }, [menu]);

  return (
    <ContextMenuContext.Provider value={open}>
      <Box
        sx={{ display: "contents" }}
        onContextMenu={(event) => {
          if (isTextInput(event.target)) return;
          event.preventDefault();
          if ((event.target as Element).closest("#ems-context-menu")) return;
          const target =
            event.target instanceof HTMLElement
              ? event.target
              : event.currentTarget;
          const rect = target.getBoundingClientRect();
          open({
            title,
            actions,
            trigger: target,
            position:
              event.clientX === 0 && event.clientY === 0
                ? { left: rect.left, top: rect.bottom }
                : { left: event.clientX, top: event.clientY },
          });
        }}
        onKeyDown={(event) => {
          if (
            isTextInput(event.target) ||
            !(
              event.key === "ContextMenu" ||
              (event.shiftKey && event.key === "F10")
            )
          )
            return;
          if ((event.target as Element).closest("#ems-context-menu")) return;
          event.preventDefault();
          const target =
            event.target instanceof HTMLElement
              ? event.target
              : event.currentTarget;
          const rect = target.getBoundingClientRect();
          open({
            title,
            actions,
            trigger: target,
            position: { left: rect.left, top: rect.bottom },
          });
        }}
      >
        {children}
        <Menu
          open={!!menu}
          onClose={(_, reason) => close(reason !== "backdropClick")}
          anchorReference="anchorPosition"
          anchorPosition={menu?.position}
          disableRestoreFocus
          disableEnforceFocus
          hideBackdrop
          sx={{ pointerEvents: "none" }}
          slotProps={{
            paper: {
              id: "ems-context-menu",
              sx: {
                pointerEvents: "auto",
                minWidth: 220,
                maxWidth: "calc(100vw - 32px)",
                border: 1,
                borderColor: "divider",
                boxShadow: "0 8px 32px rgba(28,33,56,0.16)",
              },
            },
            list: {
              "aria-label": menu ? `${menu.title} actions` : "EMS controls",
              dense: true,
            },
            transition: {
              onExited: () => {
                if (restoreFocus.current && trigger.current?.isConnected)
                  trigger.current.focus();
              },
            },
          }}
        >
          <Typography
            component="li"
            role="presentation"
            variant="subtitle2"
            sx={{
              px: 2,
              py: 1,
              color: "text.secondary",
              overflowWrap: "anywhere",
            }}
          >
            {menu?.title}
          </Typography>
          <Divider />
          {menu?.actions.map((action, index) => (
            <MenuItem
              key={action.label}
              disabled={action.disabled}
              aria-label={action.label}
              aria-describedby={
                action.description ? `${id}-${index}-description` : undefined
              }
              sx={{
                minHeight: 44,
                color: action.danger ? "error.main" : undefined,
              }}
              onClick={() => {
                if (action.disabled) return;
                close(action.restoreFocus);
                action.onSelect();
              }}
            >
              {action.icon && (
                <ListItemIcon sx={{ color: "inherit" }}>
                  {action.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={action.label}
                secondary={action.description}
                slotProps={{
                  secondary: {
                    id: `${id}-${index}-description`,
                    sx: { fontSize: 11, maxWidth: 240, whiteSpace: "normal" },
                  },
                }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </ContextMenuContext.Provider>
  );
}
