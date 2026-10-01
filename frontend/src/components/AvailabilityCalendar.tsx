import { useRef, useState, type PointerEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { alpha } from "@mui/material/styles";
import type { Availability } from "../api/workflows";
import { statusLabel } from "../api/workflows";
import {
  availabilityError,
  minuteTime,
  snapMinute,
  timeMinutes,
  WEEKDAYS,
} from "./scheduleInteraction";
import { useObjectContextMenu } from "./context-menu/context";
import { useObjectControls } from "./context-menu/objectControls";

const HOUR_HEIGHT = 52;
const HEIGHT = HOUR_HEIGHT * 24;
const tone = (type: string) =>
  type === "UNAVAILABLE"
    ? "error"
    : type === "PREFERRED"
      ? "primary"
      : "success";
type Gesture = {
  mode: "move" | "start" | "end" | "create";
  entry: Availability;
  originY: number;
  top: number;
  moved: boolean;
};

export default function AvailabilityCalendar({
  entries,
  loading,
  onEdit,
  onDelete,
  onSave,
}: {
  entries: Availability[];
  loading: boolean;
  onEdit: (entry?: Availability) => void;
  onDelete: (entry: Availability) => void;
  onSave: (entry: Availability) => Promise<void>;
}) {
  const contextMenu = useObjectContextMenu();
  const { objectActions, pasteAction, showDetails } = useObjectControls();
  const grid = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const draftRef = useRef<Availability | null>(null);
  const [draft, setDraft] = useState<Availability | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("AVAILABLE");
  const updateDraft = (entry: Availability | null) => {
    draftRef.current = entry;
    setDraft(entry);
  };
  async function save(entry: Availability) {
    const invalid = availabilityError(entry, entries, entry.id);
    if (invalid) {
      setError(invalid);
      updateDraft(null);
      return;
    }
    setError("");
    setPending(true);
    updateDraft(entry);
    try {
      await onSave(entry);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setPending(false);
      updateDraft(null);
    }
  }
  function begin(
    event: PointerEvent<HTMLElement>,
    mode: Gesture["mode"],
    entry: Availability,
    top: number,
  ) {
    if (pending || loading || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      mode,
      entry,
      originY: event.clientY,
      top,
      moved: false,
    };
    updateDraft(entry);
    setError("");
  }
  function move(event: PointerEvent<HTMLElement>) {
    const action = gesture.current,
      rect = grid.current?.getBoundingClientRect();
    if (!action || !rect) return;
    if (Math.abs(event.clientY - action.originY) > 3 || !rect)
      action.moved = true;
    const entry = { ...action.entry };
    const start = timeMinutes(entry.startTime),
      end = timeMinutes(entry.endTime);
    const delta =
      Math.round((((event.clientY - action.originY) / HOUR_HEIGHT) * 60) / 15) *
      15;
    const day = Math.max(
      0,
      Math.min(
        6,
        Math.floor((event.clientX - rect.left - 64) / ((rect.width - 64) / 7)),
      ),
    );
    if (action.mode === "move") {
      entry.dayOfWeek = WEEKDAYS[day];
      const next = Math.max(0, Math.min(1439 - (end - start), start + delta));
      entry.startTime = minuteTime(next);
      entry.endTime = minuteTime(next + end - start);
      if (entry.dayOfWeek !== action.entry.dayOfWeek) action.moved = true;
    } else if (action.mode === "start")
      entry.startTime = minuteTime(
        Math.max(0, Math.min(end - 15, start + delta)),
      );
    else if (action.mode === "end")
      entry.endTime = minuteTime(
        Math.max(start + 15, Math.min(1439, end + delta)),
      );
    else {
      const next = snapMinute(
        ((event.clientY - action.top) / HOUR_HEIGHT) * 60,
      );
      entry.startTime = minuteTime(Math.min(start, Math.min(1424, next)));
      entry.endTime = minuteTime(Math.min(1439, Math.max(start + 15, next)));
    }
    updateDraft(entry);
  }
  function finish(event: PointerEvent<HTMLElement>) {
    const action = gesture.current,
      next = draftRef.current;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!action || !next) return;
    if (!action.moved) {
      updateDraft(null);
      onEdit(action.entry);
      return;
    }
    if (
      JSON.stringify(next) === JSON.stringify(action.entry) &&
      action.mode !== "create"
    ) {
      updateDraft(null);
      return;
    }
    void save(next);
  }
  const pointerHandlers = {
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: () => {
      gesture.current = null;
      updateDraft(null);
    },
  };
  const visible = [
    ...entries.filter((a) => a.id !== draft?.id),
    ...(draft ? [draft] : []),
  ];
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap" }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3">My weekly availability</Typography>
          <Typography variant="body2" color="text.secondary">
            Repeats every week · Mountain Time
          </Typography>
        </Box>
        <TextField
          select
          label="New block type"
          size="small"
          value={type}
          onChange={(e) => setType(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          {["AVAILABLE", "PREFERRED", "UNAVAILABLE"].map((t) => (
            <MenuItem value={t} key={t}>
              {statusLabel(t)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          disabled={loading || pending}
          onClick={() =>
            onEdit({
              id: -1,
              dayOfWeek: "SATURDAY",
              startTime: "09:00",
              endTime: "17:00",
              type,
            })
          }
        >
          Add availability
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Drag on a day to add a block. Drag a card to move it; use its top or
        bottom handle to resize in 15-minute steps. Click Edit for exact times.
        Use arrow keys to move a focused card, or Shift + ↑/↓ to resize.
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {["AVAILABLE", "PREFERRED", "UNAVAILABLE"].map((t) => (
          <Chip
            key={t}
            label={statusLabel(t)}
            color={tone(t)}
            size="small"
            variant="outlined"
          />
        ))}
        {pending && (
          <Typography role="status" variant="body2">
            Saving availability…
          </Typography>
        )}
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ overflow: "hidden", minWidth: 0 }}>
        <Box
          sx={{ overflow: "auto", maxHeight: "65vh" }}
          ref={(node: HTMLDivElement | null) => {
            if (node && !node.dataset.initialized) {
              node.scrollTop = 6 * HOUR_HEIGHT;
              node.dataset.initialized = "true";
            }
          }}
        >
          <Box
            ref={grid}
            aria-label="Weekly availability calendar"
            sx={{ minWidth: 1000 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
                position: "sticky",
                top: 0,
                zIndex: 4,
                bgcolor: "#FAFBFD",
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" sx={{ p: 1.5 }}>
                Time
              </Typography>
              {WEEKDAYS.map((day) => (
                <Typography
                  key={day}
                  sx={{
                    textAlign: "center",
                    py: 2,
                    borderLeft: 1,
                    borderColor: "divider",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {statusLabel(day)}
                </Typography>
              ))}
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "64px repeat(7, minmax(0, 1fr))",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  height: HEIGHT,
                  bgcolor: "#FAFBFD",
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <Typography
                    key={h}
                    variant="caption"
                    sx={{
                      position: "absolute",
                      top: h * HOUR_HEIGHT + 4,
                      right: 8,
                      fontSize: 11,
                    }}
                    color="text.secondary"
                  >
                    {h === 0
                      ? "12am"
                      : h < 12
                        ? `${h}am`
                        : h === 12
                          ? "12pm"
                          : `${h - 12}pm`}
                  </Typography>
                ))}
              </Box>
              {WEEKDAYS.map((day) => (
                <Box
                  key={day}
                  data-availability-day={day}
                  aria-label={`${statusLabel(day)} availability`}
                  {...pointerHandlers}
                  {...contextMenu(`${statusLabel(day)} availability`, [
                    pasteAction({
                      kind: "availability",
                      disabled: pending || loading,
                      onPaste: (values) =>
                        onEdit({
                          id: -1,
                          dayOfWeek: day,
                          startTime: values.startTime,
                          endTime: values.endTime,
                          type: values.type,
                        }),
                    }),
                    {
                      label: "Add availability",
                      disabled: pending || loading,
                      onSelect: () =>
                        onEdit({
                          id: -1,
                          dayOfWeek: day,
                          startTime: "09:00",
                          endTime: "17:00",
                          type,
                        }),
                    },
                  ])}
                  onPointerDown={(event) => {
                    if (
                      event.pointerType === "touch" ||
                      event.target !== event.currentTarget
                    )
                      return;
                    const top = event.currentTarget.getBoundingClientRect().top;
                    const start = Math.min(
                      1424,
                      snapMinute(((event.clientY - top) / HOUR_HEIGHT) * 60),
                    );
                    begin(
                      event,
                      "create",
                      {
                        id: -1,
                        dayOfWeek: day,
                        startTime: minuteTime(start),
                        endTime: minuteTime(Math.min(1439, start + 60)),
                        type,
                      },
                      top,
                    );
                  }}
                  sx={{
                    height: HEIGHT,
                    position: "relative",
                    borderLeft: 1,
                    borderColor: "divider",
                    cursor: pending ? "wait" : "crosshair",
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0, transparent 25px, #F1F2F6 25px, #F1F2F6 26px, transparent 26px, transparent 51px, #E4E6ED 51px, #E4E6ED 52px)",
                  }}
                >
                  {visible
                    .filter((a) => a.dayOfWeek === day)
                    .map((a) => {
                      const start = timeMinutes(a.startTime),
                        end = timeMinutes(a.endTime),
                        color = tone(a.type);
                      const menu = contextMenu(
                        `${statusLabel(day)} · ${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)}`,
                        objectActions({
                          copy: {
                            kind: "availability",
                            label: `${statusLabel(day)} availability`,
                            values: {
                              dayOfWeek: day,
                              startTime: a.startTime,
                              endTime: a.endTime,
                              type: a.type,
                            },
                          },
                          paste: {
                            kind: "availability",
                            disabled: pending || loading,
                            onPaste: (values) =>
                              onEdit({
                                id: -1,
                                dayOfWeek: day,
                                startTime: values.startTime,
                                endTime: values.endTime,
                                type: values.type,
                              }),
                          },
                          edit: () => onEdit(a),
                          delete: a.id >= 0 ? () => onDelete(a) : undefined,
                          disabled: pending || loading,
                          details: () =>
                            showDetails("Availability details", {
                              day: statusLabel(day),
                              startTime: a.startTime.slice(0, 5),
                              endTime: a.endTime.slice(0, 5),
                              availability: statusLabel(a.type),
                            }),
                        }),
                      );
                      const handle = (edge: "start" | "end") => (
                        <Box
                          role="slider"
                          aria-orientation="vertical"
                          tabIndex={pending ? -1 : 0}
                          aria-label={`Resize ${edge} of ${statusLabel(day)} ${statusLabel(a.type).toLowerCase()} block`}
                          aria-valuemin={edge === "start" ? 0 : start + 15}
                          aria-valuemax={edge === "end" ? 1439 : end - 15}
                          aria-valuenow={edge === "start" ? start : end}
                          aria-valuetext={
                            edge === "start" ? a.startTime : a.endTime
                          }
                          onPointerDown={(event) => begin(event, edge, a, 0)}
                          {...pointerHandlers}
                          onKeyDown={(event) => {
                            if (
                              pending ||
                              !["ArrowUp", "ArrowDown"].includes(event.key)
                            )
                              return;
                            event.preventDefault();
                            const next =
                              (edge === "start" ? start : end) +
                              (event.key === "ArrowUp" ? -15 : 15);
                            if (
                              next >= 0 &&
                              next <= 1439 &&
                              (edge === "start" ? next < end : next > start)
                            )
                              void save({
                                ...a,
                                [edge === "start" ? "startTime" : "endTime"]:
                                  minuteTime(next),
                              });
                          }}
                          sx={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            [edge === "start" ? "top" : "bottom"]: 0,
                            height: 10,
                            cursor: "ns-resize",
                            touchAction: "none",
                            display: "grid",
                            placeItems: "center",
                            zIndex: 2,
                            "&:focus-visible": {
                              outline: "2px solid",
                              outlineColor: `${color}.main`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 3,
                              borderRadius: 2,
                              bgcolor: `${color}.main`,
                              opacity: 0.55,
                            }}
                          />
                        </Box>
                      );
                      return (
                        <Box
                          key={a.id}
                          role="button"
                          tabIndex={pending ? -1 : 0}
                          aria-disabled={pending}
                          aria-label={`${statusLabel(day)} ${statusLabel(a.type).toLowerCase()} ${a.startTime.slice(0, 5)}–${a.endTime.slice(0, 5)}`}
                          onContextMenu={menu.onContextMenu}
                          onPointerDown={(event) => begin(event, "move", a, 0)}
                          {...pointerHandlers}
                          onKeyDown={(event) => {
                            menu.onKeyDown(event);
                            if (event.defaultPrevented) return;
                            if (event.target !== event.currentTarget || pending)
                              return;
                            if (["Enter", " "].includes(event.key)) {
                              event.preventDefault();
                              onEdit(a);
                              return;
                            }
                            if (
                              ![
                                "ArrowUp",
                                "ArrowDown",
                                "ArrowLeft",
                                "ArrowRight",
                              ].includes(event.key)
                            )
                              return;
                            event.preventDefault();
                            const next = { ...a };
                            if (
                              event.key === "ArrowLeft" ||
                              event.key === "ArrowRight"
                            )
                              next.dayOfWeek =
                                WEEKDAYS[
                                  (WEEKDAYS.indexOf(day) +
                                    (event.key === "ArrowLeft" ? 6 : 1)) %
                                    7
                                ];
                            else {
                              const delta = event.key === "ArrowUp" ? -15 : 15;
                              if (event.shiftKey) {
                                if (end + delta <= start || end + delta > 1439)
                                  return;
                                next.endTime = minuteTime(end + delta);
                              } else {
                                if (start + delta < 0 || end + delta > 1439)
                                  return;
                                next.startTime = minuteTime(start + delta);
                                next.endTime = minuteTime(end + delta);
                              }
                            }
                            void save(next);
                          }}
                          sx={{
                            position: "absolute",
                            top: (start / 60) * HOUR_HEIGHT,
                            height: Math.max(
                              13,
                              ((end - start) / 60) * HOUR_HEIGHT,
                            ),
                            left: 4,
                            right: 4,
                            zIndex: draft?.id === a.id ? 3 : 1,
                            border: "1px solid",
                            borderColor: `${color}.main`,
                            borderLeftWidth: 3,
                            borderRadius: 1,
                            bgcolor: (theme) =>
                              alpha(theme.palette[color].main, 0.12),
                            color: `${color}.dark`,
                            p: 1,
                            pt: 1.5,
                            cursor: "grab",
                            touchAction: "none",
                            overflow: "hidden",
                            boxShadow: draft?.id === a.id ? 3 : 0,
                            "&:focus-visible": {
                              outline: "2px solid",
                              outlineColor: `${color}.main`,
                              outlineOffset: 2,
                            },
                          }}
                        >
                          {handle("start")}
                          <Typography
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              pointerEvents: "none",
                            }}
                          >
                            {a.startTime.slice(0, 5)}–{a.endTime.slice(0, 5)}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11, pointerEvents: "none" }}
                          >
                            {statusLabel(a.type)}
                          </Typography>
                          {a.id >= 0 && end - start >= 60 && (
                            <Stack
                              direction="row"
                              sx={{ mt: 0.5 }}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <IconButton
                                size="small"
                                aria-label={`Edit ${statusLabel(day)} ${a.startTime.slice(0, 5)} availability`}
                                disabled={pending}
                                onClick={() => onEdit(a)}
                              >
                                <EditRounded sx={{ fontSize: 15 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label={`Delete ${statusLabel(day)} ${a.startTime.slice(0, 5)} availability`}
                                disabled={pending}
                                onClick={() => onDelete(a)}
                              >
                                <DeleteOutlineRounded sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Stack>
                          )}
                          {handle("end")}
                        </Box>
                      );
                    })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Paper>
      {!entries.length && !loading && (
        <Typography variant="body2" color="text.secondary">
          No weekly hours recorded. Add your available, preferred, or
          unavailable times above.
        </Typography>
      )}
    </Stack>
  );
}
