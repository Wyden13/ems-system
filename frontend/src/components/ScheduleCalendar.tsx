import { zoneForDate } from "../api/timezone";
import { StatusGroups } from "./ui/StatusGroups";
import { workGroup } from "./ui/statusGrouping";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  useMediaQuery,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQueries } from "@tanstack/react-query";
import { checkAssignment, previewKey } from "../api/scheduling";
import { alpha, useTheme } from "@mui/material/styles";
import CloseRounded from "@mui/icons-material/CloseRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import PeopleOutlineRounded from "@mui/icons-material/PeopleOutlineRounded";
import ScheduleStaffingSummary from "./ScheduleStaffingSummary";
import { cad, type WageEstimate } from "../api/wages";
import { addDays, businessDate, midnight } from "../api/attendance";
import {
  statusLabel,
  type Category,
  type ScheduleOptions,
  type Shift,
  type WorkforcePerson,
} from "../api/workflows";
import {
  activeAssignments,
  hoursInRange,
  openPositions,
} from "./scheduleRoster";
import { employeeDragPreview } from "./employeeDragPreview";
import {
  useObjectContextMenu,
  type ContextAction,
} from "./context-menu/context";
import { useObjectControls } from "./context-menu/objectControls";

const time = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zoneForDate(new Date(value)),
  })
    .format(new Date(value))
    .replace(" AM", "a")
    .replace(" PM", "p");
const dayLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
const hoursLabel = (hours: number) => `${Number(hours.toFixed(1))}h`;
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
const columns = {
  xs: "164px repeat(7, minmax(140px, 1fr)) 72px",
  md: "220px repeat(7, minmax(140px, 1fr)) 72px",
};

export default function ScheduleCalendar({
  from,
  shifts,
  options,
  categories = [],
  planner,
  view = "week",
  initialShiftId,
  navigationControls,
  wageEstimates,
  wageScope = "team",
  renderShift,
  renderDetails,
  createShift,
  assignEmployee,
  shiftActions,
  pasteShift,
}: {
  from: string;
  shifts: Shift[];
  options?: ScheduleOptions;
  categories?: Category[];
  planner: boolean;
  view?: "list" | "week";
  initialShiftId?: number;
  navigationControls?: ReactNode;
  wageEstimates?: WageEstimate[];
  wageScope?: "team" | "self";
  renderDetails: (shift: Shift) => ReactNode;
  renderShift: (shift: Shift, viewDetails?: () => void) => ReactNode;
  createShift: (day: string, employee?: WorkforcePerson) => void;
  assignEmployee: (shift: Shift, employee?: WorkforcePerson) => void;
  shiftActions?: (
    shift: Shift,
    details: () => void,
    day: string,
  ) => ContextAction[];
  pasteShift?: (
    values: Record<string, string>,
    day: string,
    employee?: WorkforcePerson,
  ) => void;
}) {
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const contextMenu = useObjectContextMenu();
  const { objectActions, pasteAction, showDetails } = useObjectControls();
  const dragPreview = useRef<HTMLCanvasElement | undefined>(undefined);
  useEffect(() => () => dragPreview.current?.remove(), []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [expandedOpenDays, setExpandedOpenDays] = useState<Set<string>>(() => new Set());
  const [employeeId, setEmployeeId] = useState<number>();
  const [dropError, setDropError] = useState("");
  const [hovered, setHovered] = useState<string>();
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  const [attention, setAttention] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(
    initialShiftId,
  );
  const end = addDays(from, view === "week" ? 7 : 14);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  // Resolve each day's time-zone boundary once, rather than once per roster cell.
  const boundaries = new Map(
    [...days, addDays(from, 7), end].map((day) => [
      day,
      Date.parse(midnight(day)),
    ]),
  );
  const rangeHours = (shift: Shift) =>
    hoursInRange(shift, boundaries.get(from)!, boundaries.get(end)!);
  const overlaps = (shift: Shift, day: string) =>
    hoursInRange(
      shift,
      boundaries.get(day)!,
      boundaries.get(addDays(day, 1))!,
    ) > 0;
  const departments = options?.departments ?? [];
  const locations = [
    ...new Map(
      departments.map((d) => [
        d.locationId,
        { id: d.locationId, name: d.locationName },
      ]),
    ).values(),
  ];
  // Retain assigned workers even if they are no longer in the employee directory.
  const people: WorkforcePerson[] = [...(options?.people ?? [])];
  for (const shift of shifts)
    for (const assignment of activeAssignments(shift)) {
      if (!people.some((p) => p.id === assignment.employeeId))
        people.push({
          id: assignment.employeeId,
          name: `Employee ${assignment.employeeId}`,
          employeeNumber: "",
          departmentId: shift.departmentId ?? 0,
          active: false,
          self: false,
        });
    }
  const matchesSearch = (person: WorkforcePerson) =>
    `${person.name} ${person.employeeNumber}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  const filtered = shifts
    .filter(
      (s) =>
        rangeHours(s) > 0 &&
        (status ? s.status === status : s.status !== "CANCELLED") &&
        (!locationId || String(s.locationId) === locationId) &&
        (!departmentId || String(s.departmentId) === departmentId) &&
        (!categoryIds.length || categoryIds.includes(s.shiftCategoryId)) &&
        (!attention || s.status === "DRAFT" || openPositions(s) > 0) &&
        (!search.trim() ||
          (planner && !!employeeId) ||
          activeAssignments(s).some((a) =>
            people.some((p) => p.id === a.employeeId && matchesSearch(p)),
          )),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const roster = people
    .filter(
      (p) =>
        matchesSearch(p) &&
        (!departmentId ||
          String(p.departmentId) === departmentId ||
          filtered.some((s) =>
            activeAssignments(s).some((a) => a.employeeId === p.id),
          )) &&
        (!locationId ||
          departments.some(
            (d) =>
              d.id === p.departmentId && String(d.locationId) === locationId,
          ) ||
          filtered.some((s) =>
            activeAssignments(s).some((a) => a.employeeId === p.id),
          )) &&
        (p.active ||
          filtered.some((s) =>
            activeAssignments(s).some((a) => a.employeeId === p.id),
          )),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const live = filtered.filter((s) => s.status !== "CANCELLED");
  const open = live.filter((s) => openPositions(s) > 0);
  const missing = open.reduce((sum, s) => sum + openPositions(s), 0);
  const selected = shifts.find((s) => s.id === selectedId);
  const filterCount =
    Number(!!locationId) +
    Number(!!departmentId) +
    Number(!!categoryIds.length) +
    Number(!!status) +
    Number(attention);
  const shiftsByPerson = new Map<number, Shift[]>();
  for (const shift of filtered)
    for (const assignment of activeAssignments(shift)) {
      const assigned = shiftsByPerson.get(assignment.employeeId) ?? [];
      if (!assigned.some((s) => s.id === shift.id)) assigned.push(shift);
      shiftsByPerson.set(assignment.employeeId, assigned);
    }
  const personShifts = (id: number) => shiftsByPerson.get(id) ?? [];
  const totals = new Map(
    roster.map((p) => [
      p.id,
      personShifts(p.id)
        .filter((s) => s.status !== "CANCELLED")
        .reduce((sum, s) => sum + rangeHours(s), 0),
    ]),
  );
  const personHours = (id: number) => totals.get(id) ?? 0;
  const scheduledHours = roster.reduce((sum, p) => sum + personHours(p.id), 0);
  const wageRates = new Map((wageEstimates ?? []).map(estimate => [estimate.employeeId, Number(estimate.hourlyRate)]));
  const personWage = (id: number) => wageRates.has(id) ? personHours(id) * wageRates.get(id)! : undefined;
  const knownWages = roster.filter(person => personWage(person.id) !== undefined);
  const scheduledWages = knownWages.length ? knownWages.reduce((sum, person) => sum + personWage(person.id)!, 0) : undefined;
  const categoryColor = (shift: Shift) => {
    const value = categories.find((c) => c.id === shift.shiftCategoryId)?.color;
    return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#5B4BE1";
  };
  const clearFilters = () => {
    setSearch("");
    setLocationId("");
    setDepartmentId("");
    setCategoryIds([]);
    setStatus("");
    setAttention(false);
  };

  const chosen = options?.people.find((p) => p.id === employeeId && p.active);
  const targetShifts = live.filter(
    (s) =>
      chosen &&
      s.departmentId === chosen.departmentId &&
      openPositions(s) > 0 &&
      !activeAssignments(s).some((a) => a.employeeId === chosen.id),
  );
  const previews = useQueries({
    queries: targetShifts.map((s) => {
      const candidate = { employeeId: chosen!.id, shiftId: s.id };
      return {
        queryKey: previewKey(candidate),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          checkAssignment(candidate, signal),
        staleTime: 0,
        retry: false,
      };
    }),
  });
  const targetStatus = (s: Shift) => {
    if (!chosen) return undefined;
    if (s.departmentId !== chosen.departmentId)
      return {
        state: "BLOCKED",
        reasons: ["Employee and shift must belong to the same department."],
      };
    if (s.status === "CANCELLED")
      return { state: "BLOCKED", reasons: ["This shift is cancelled."] };
    if (activeAssignments(s).some((a) => a.employeeId === chosen.id))
      return { state: "BLOCKED", reasons: ["Employee is already assigned."] };
    if (!openPositions(s))
      return { state: "BLOCKED", reasons: ["Shift is fully staffed."] };
    const result =
      previews[targetShifts.findIndex((target) => target.id === s.id)];
    if (!result || result.isPending)
      return {
        state: "CHECKING",
        reasons: ["Checking availability and conflicts…"],
      };
    if (result.error)
      return {
        state: "CHECKING",
        reasons: ["Check failed. Open the assignment dialog to retry."],
      };
    return result.data;
  };
  const dropPerson = (event: DragEvent<HTMLElement>) => {
    const id = Number(event.dataTransfer.getData("application/x-ems-employee"));
    return options?.people.find((p) => p.id === id && p.active);
  };
  const dropOnShift = (event: DragEvent<HTMLElement>, s: Shift) => {
    event.preventDefault();
    event.stopPropagation();
    setHovered(undefined);
    const person = dropPerson(event);
    if (!person || !planner) return;
    const result = targetStatus(s);
    if (result?.state === "BLOCKED" && person.id === chosen?.id) {
      setDropError(result.reasons.join(" "));
      return;
    }
    assignEmployee(s, person);
  };
  const dayDrop = (day: string, owner?: number) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!planner || !chosen || (owner !== undefined && owner !== chosen.id))
        return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setHovered(`day-${day}-${owner ?? "open"}`);
    },
    onDragLeave: () => setHovered(undefined),
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setHovered(undefined);
      const person = dropPerson(event);
      if (planner && person && (owner === undefined || owner === person.id)) {
        setDropError("");
        createShift(day, person);
      }
    },
  });
  const selectEmployee = (person: WorkforcePerson) => {
    setEmployeeId(person.id);
    setDropError("");
  };
  const startEmployeeDrag = (
    event: DragEvent<HTMLElement>,
    person: WorkforcePerson,
  ) => {
    event.dataTransfer.setData("application/x-ems-employee", String(person.id));
    event.dataTransfer.effectAllowed = "copy";
    dragPreview.current?.remove();
    dragPreview.current = employeeDragPreview(person, theme.palette);
    if (dragPreview.current)
      event.dataTransfer.setDragImage(dragPreview.current, 30, 32);
    setEmployeeId(person.id);
  };
  const endEmployeeDrag = () => {
    dragPreview.current?.remove();
    dragPreview.current = undefined;
    setHovered(undefined);
  };

  const filters = (
    <Stack spacing={2.5} sx={{ p: 2.5 }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h3">Filters</Typography>
        <Button size="small" onClick={clearFilters}>
          Clear
        </Button>
        <IconButton
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        >
          <CloseRounded />
        </IconButton>
      </Stack>
      <TextField
        select
        label="Location"
        size="small"
        value={locationId}
        slotProps={{
          inputLabel: { shrink: true },
          select: { displayEmpty: true },
        }}
        onChange={(e) => {
          setLocationId(e.target.value);
          setDepartmentId("");
        }}
      >
        <MenuItem value="">All locations</MenuItem>
        {locations.map((l) => (
          <MenuItem key={l.id} value={String(l.id)}>
            {l.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Department"
        size="small"
        value={departmentId}
        slotProps={{
          inputLabel: { shrink: true },
          select: { displayEmpty: true },
        }}
        onChange={(e) => setDepartmentId(e.target.value)}
      >
        <MenuItem value="">All departments</MenuItem>
        {departments
          .filter((d) => !locationId || String(d.locationId) === locationId)
          .map((d) => (
            <MenuItem key={d.id} value={String(d.id)}>
              {d.name}
            </MenuItem>
          ))}
      </TextField>
      <Divider />
      <Box component="fieldset" sx={{ m: 0, p: 0, border: 0 }}>
        <Typography component="legend" variant="subtitle2" sx={{ mb: 1 }}>
          Shift categories
        </Typography>
        <Stack>
          <FormControlLabel
            label="All categories"
            control={
              <Checkbox
                size="small"
                checked={categoryIds.length === 0}
                onChange={() => setCategoryIds([])}
              />
            }
          />
          {categories.map((c) => (
            <FormControlLabel
              key={c.id}
              sx={{ mr: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) =>
                    setCategoryIds((ids) =>
                      e.target.checked
                        ? [...ids, c.id]
                        : ids.filter((id) => id !== c.id),
                    )
                  }
                />
              }
              label={
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: /^#[0-9a-f]{6}$/i.test(c.color)
                        ? c.color
                        : "primary.main",
                    }}
                  />
                  <Typography variant="body2">{c.name}</Typography>
                </Stack>
              }
            />
          ))}
        </Stack>
      </Box>
      <Divider />
      <TextField
        select
        label="Shift status"
        size="small"
        value={status}
        slotProps={{
          inputLabel: { shrink: true },
          select: { displayEmpty: true },
        }}
        onChange={(e) => setStatus(e.target.value)}
      >
        <MenuItem value="">Active shifts</MenuItem>
        {["DRAFT", "PUBLISHED", "CANCELLED"].map((s) => (
          <MenuItem key={s} value={s}>
            {statusLabel(s)}
          </MenuItem>
        ))}
      </TextField>
      <FormControlLabel
        sx={{ alignItems: "flex-start", m: 0 }}
        control={
          <Checkbox
            size="small"
            checked={attention}
            onChange={(e) => setAttention(e.target.checked)}
          />
        }
        label={
          <Box sx={{ pt: 0.75 }}>
            <Typography variant="body2">Needs attention</Typography>
            <Typography variant="caption" color="text.secondary">
              Drafts and unfilled positions
            </Typography>
          </Box>
        }
      />
    </Stack>
  );

  const shiftCard = (shift: Shift, day: string, openRow = false) => {
    const overnight =
      businessDate(new Date(shift.startsAt)) !==
      businessDate(new Date(shift.endsAt));
    const continuation = businessDate(new Date(shift.startsAt)) < day;
    const result = targetStatus(shift);
    const color =
      result?.state === "BLOCKED"
        ? "error"
        : result?.state === "AVAILABLE"
          ? "success"
          : "warning";
    const targetId = `shift-${shift.id}-${day}-${openRow}`;
    return (
      <Button
        key={shift.id}
        aria-label={`${shift.categoryName}, ${day}, shift ${shift.id}${openRow ? ", open coverage" : ""}`}
        {...contextMenu(
          `${shift.categoryName} · Shift ${shift.id}`,
          shiftActions?.(shift, () => setSelectedId(shift.id), day) ?? [
            { label: "Details", onSelect: () => setSelectedId(shift.id) },
          ],
        )}
        aria-pressed={selectedId === shift.id}
        onClick={() => setSelectedId(shift.id)}
        onDragOver={(event) => {
          if (!planner || !chosen) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect =
            result?.state === "BLOCKED" ? "none" : "copy";
          setHovered(targetId);
        }}
        onDragLeave={() => setHovered(undefined)}
        onDrop={(event) => dropOnShift(event, shift)}
        sx={{
          display: "block",
          textAlign: "left",
          width: "100%",
          minWidth: 0,
          px: 1.25,
          py: 1,
          color: "text.primary",
          border: "1px solid",
          borderColor: result
            ? `${color}.main`
            : selectedId === shift.id
              ? "primary.main"
              : alpha(categoryColor(shift), 0.3),
          borderLeft: `3px solid ${categoryColor(shift)}`,
          borderRadius: 1,
          bgcolor: alpha(categoryColor(shift), 0.09),
          borderStyle: shift.status === "DRAFT" ? "dashed" : "solid",
          transition:
            "background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
          ...(result && {
            bgcolor: (theme) =>
              alpha(
                theme.palette[color].main,
                hovered === targetId ? 0.16 : 0.07,
              ),
          }),
          ...(hovered === targetId && {
            transform: "translateY(-2px)",
            boxShadow: 3,
            animation: "schedule-target 900ms ease-in-out infinite alternate",
            outlineStyle: "solid",
            outlineColor: `${color}.light`,
          }),
          "@keyframes schedule-target": {
            from: { outlineWidth: "0px" },
            to: { outlineWidth: "3px" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
            animation: "none",
            transform: "none",
          },
          boxShadow: hovered === targetId ? 3 : "none",
          opacity: shift.status === "CANCELLED" ? 0.55 : 1,
          "&:hover": {
            bgcolor: result
              ? (theme) => alpha(theme.palette[color].main, 0.16)
              : alpha(categoryColor(shift), 0.16),
            borderColor: result ? `${color}.main` : "primary.main",
            boxShadow: "0 3px 8px rgba(91,75,225,0.12)",
          },
        }}
      >
        {result && (
          <Typography
            sx={{ fontSize: 10, fontWeight: 700, mb: 0.5 }}
            color={`${color}.main`}
          >
            {result.state === "AVAILABLE"
              ? "✓ Available"
              : result.state === "BLOCKED"
                ? "× Blocked"
                : result.state === "WARNING"
                  ? "⚠ Availability warning"
                  : "Checking…"}
          </Typography>
        )}
        {result && (
          <Typography sx={{ fontSize: 10, mb: 0.5 }} color="text.secondary">
            {result.reasons.join(" ")}
          </Typography>
        )}
        <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
          {time(shift.startsAt)} – {time(shift.endsAt)}
        </Typography>
        <Typography sx={{ fontSize: 12, lineHeight: 1.5 }} noWrap>
          {shift.categoryName}
        </Typography>
        {overnight && (
          <Typography sx={{ fontSize: 11 }} color="text.secondary">
            {continuation ? "Continues from previous day" : "Ends next day"}
          </Typography>
        )}
        <Stack direction="row" sx={{ gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
          <Box
            component="span"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              px: 0.75,
              py: 0.2,
              borderRadius: 0.5,
              bgcolor:
                shift.status === "DRAFT" ? "warning.light" : "action.hover",
              color:
                shift.status === "DRAFT" ? "warning.main" : "text.secondary",
            }}
          >
            {statusLabel(shift.status)}
          </Box>
          {openRow && (
            <Box
              component="span"
              sx={{
                fontSize: 10,
                fontWeight: 600,
                px: 0.75,
                py: 0.2,
                borderRadius: 0.5,
                bgcolor: "warning.light",
                color: "warning.main",
              }}
            >
              {openPositions(shift)} open
            </Box>
          )}
        </Stack>
      </Button>
    );
  };
  const cellStyle = {
    borderBottom: 1,
    borderRight: 1,
    borderColor: "divider",
    p: 1,
    minWidth: 0,
  };
  const employeeLabel = (person: WorkforcePerson) => {
    const label = (
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ alignItems: "center", minWidth: 0 }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: "primary.main",
          }}
        >
          {initials(person.name)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
            {person.name}
            {person.self && " (you)"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: 11 }}
            color="text.secondary"
          >
            {hoursLabel(personHours(person.id))} scheduled
            {personWage(person.id) !== undefined && ` · ${cad(personWage(person.id)!)} est.`}
            {!person.active && " · Inactive"}
          </Typography>
        </Box>
      </Stack>
    );
    const menu = contextMenu(
      person.name,
      objectActions({
        copy: {
          kind: "employee",
          label: person.name,
          values: {
            name: person.name,
            departmentId: String(person.departmentId),
            employeeNumber: person.employeeNumber,
          },
        },
        paste: {
          kind: "shift",
          disabled: !planner || !person.active || !pasteShift,
          reason: "Only active employees can be assigned by a planner.",
          onPaste: (values) => pasteShift?.(values, from, person),
        },
        editReason: "Edit employee records on the Employees page.",
        deleteReason:
          "Employee records can be deactivated on the Employees page.",
        details: () =>
          showDetails("Employee details", {
            name: person.name,
            employeeNumber: person.employeeNumber,
            department:
              departments.find((d) => d.id === person.departmentId)?.name ??
              "—",
            status: person.active ? "Active" : "Inactive",
            scheduledHours: hoursLabel(personHours(person.id)),
          }),
      }),
    );
    return planner && person.active ? (
      <Button
        aria-label={`Select ${person.name} for scheduling`}
        aria-pressed={chosen?.id === person.id}
        {...menu}
        draggable
        onDragStart={(event) => startEmployeeDrag(event, person)}
        onDragEnd={endEmployeeDrag}
        onClick={() => selectEmployee(person)}
        sx={{
          width: "100%",
          minWidth: 0,
          justifyContent: "flex-start",
          textAlign: "left",
          p: 0.75,
          color: "text.primary",
          bgcolor: chosen?.id === person.id ? "action.selected" : undefined,
        }}
      >
        {label}
      </Button>
    ) : (
      <Box {...menu}>{label}</Box>
    );
  };

  return (
    <Stack spacing={2}>
      {dropError && (
        <Alert severity="error" onClose={() => setDropError("")}>
          {dropError}
        </Alert>
      )}
      {planner && chosen && (
        <Alert
          severity="info"
          action={
            <Button
              size="small"
              onClick={() => {
                setEmployeeId(undefined);
                setHovered(undefined);
              }}
            >
              Clear selection
            </Button>
          }
        >
          Scheduling {chosen.name}. Drag their name onto a shift to assign them,
          or click an empty day in their row to create a shift. Green: available
          · Amber: warning · Red: blocked.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            planner && summaryOpen
              ? { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 280px" }
              : "minmax(0, 1fr)",
          gap: 2.5,
          alignItems: "start",
          minWidth: 0,
        }}
      >
        <Paper
          component="section"
          aria-label={
            view === "week" ? "Weekly schedule calendar" : "Schedule list"
          }
          variant="outlined"
          sx={{ minWidth: 0, overflow: "hidden", borderRadius: 1 }}
        >
          {!navigationControls && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                px: 2.5,
                py: 2,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <PeopleOutlineRounded
                sx={{ fontSize: 20, color: "primary.main" }}
              />
              <Typography variant="h3" sx={{ fontSize: 16, flex: 1 }}>
                {view === "list" ? "Shift list" : "Team schedule"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mountain Time
              </Typography>
            </Stack>
          )}
          <Stack
            spacing={1.5}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            {navigationControls}
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "center" }}
            >
              <Button
                variant={filtersOpen ? "contained" : "outlined"}
                startIcon={<TuneRounded />}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                Filters{filterCount > 0 && ` (${filterCount})`}
              </Button>
              <TextField
                label="Search employees"
                placeholder="Name or employee number"
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  width: { xs: "100%", sm: 280 },
                  "& .MuiOutlinedInput-root": { minHeight: 44 },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <SearchRounded
                        sx={{ mr: 1, fontSize: 19, color: "text.secondary" }}
                      />
                    ),
                  },
                }}
              />
              {planner && (
                <Button
                  variant="text"
                  aria-expanded={summaryOpen}
                  onClick={() => setSummaryOpen(!summaryOpen)}
                  sx={{ ml: "auto", px: 1 }}
                >
                  Staffing summary
                </Button>
              )}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {filtered.length} shifts · {hoursLabel(scheduledHours)}{" "}
                scheduled
              </Typography>
              <Chip
                size="small"
                color={
                  missing ? "warning" : live.length ? "success" : "default"
                }
                variant="outlined"
                label={
                  missing
                    ? `${missing} unfilled positions`
                    : live.length
                      ? "Fully staffed"
                      : "No active shifts"
                }
              />
            </Stack>
          </Stack>
          {view === "week" && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: { xs: "block", md: "none" },
                px: 1.5,
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              Swipe across the week. Employee names stay pinned.
            </Typography>
          )}
          {view === "list" ? (
            <Stack spacing={0} sx={{ "& > .MuiPaper-root": { borderRadius: 0, border: 0, borderBottom: 1, borderColor: "divider" } }}>
              <StatusGroups items={filtered} category={shift => workGroup(shift.status)}>{shift => renderShift(shift, () => setSelectedId(shift.id))}</StatusGroups>
              {!filtered.length && (
                <Typography color="text.secondary">
                  No shifts match your filters.
                </Typography>
              )}
            </Stack>
          ) : (
            <Box
              role="region"
              aria-label="Scrollable weekly roster"
              tabIndex={0}
              sx={{
                overflow: "auto",
                maxHeight: "70vh",
                isolation: "isolate",
                overscrollBehaviorX: "contain",
                "&:focus-visible": {
                  outline: "3px solid",
                  outlineColor: "primary.main",
                  outlineOffset: -3,
                },
              }}
            >
              <Box
                role="table"
                aria-label="Employee weekly roster"
                sx={{ minWidth: { xs: 1216, md: 1272 } }}
              >
                <Box
                  role="row"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: columns,
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    bgcolor: "background.default",
                  }}
                >
                  <Box
                    role="columnheader"
                    sx={{
                      ...cellStyle,
                      p: 2,
                      position: "sticky",
                      left: 0,
                      zIndex: 4,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="subtitle2">Team members</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {roster.length} people
                    </Typography>
                  </Box>
                  {days.map((day) => (
                    <Box
                      role="columnheader"
                      key={day}
                      sx={{
                        ...cellStyle,
                        textAlign: "center",
                        py: 1.5,
                        bgcolor:
                          day === businessDate()
                            ? (theme) => alpha(theme.palette.primary.main, 0.06)
                            : undefined,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {dayLabel(day, { weekday: "short" })}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          display: "inline-block",
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor:
                            day === businessDate()
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.12)
                              : undefined,
                        }}
                        color={
                          day === businessDate()
                            ? "primary.main"
                            : "text.primary"
                        }
                      >
                        {dayLabel(day, { month: "short", day: "numeric" })}
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    role="columnheader"
                    sx={{ ...cellStyle, textAlign: "center", py: 2 }}
                  >
                    <Typography variant="subtitle2">Hours</Typography>
                  </Box>
                </Box>
                <Box
                  role="row"
                  aria-label="Daily coverage"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: columns,
                    bgcolor: "background.default",
                  }}
                >
                  <Box
                    role="rowheader"
                    sx={{
                      ...cellStyle,
                      px: 2,
                      py: 1.5,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Daily coverage
                    </Typography>
                  </Box>
                  {days.map((day) => {
                    const onDay = live.filter((s) => overlaps(s, day));
                    const assigned = onDay.reduce(
                      (sum, s) => sum + activeAssignments(s).length,
                      0,
                    );
                    const required = onDay.reduce(
                      (sum, s) => sum + s.requiredEmployees,
                      0,
                    );
                    const unfilled = onDay.reduce(
                      (sum, s) => sum + openPositions(s),
                      0,
                    );
                    return (
                      <Box
                        role="cell"
                        key={day}
                        sx={{ ...cellStyle, textAlign: "center", py: 1.5 }}
                      >
                        <Tooltip
                          title={
                            required
                              ? `${assigned} assigned of ${required} required positions${unfilled ? ` · ${unfilled} unfilled` : ""}`
                              : "No shifts scheduled"
                          }
                        >
                          <Typography
                            variant="caption"
                            color={unfilled ? "warning.main" : "text.secondary"}
                            sx={{ fontWeight: 600 }}
                          >
                            {required ? `${assigned}/${required} staffed` : "—"}
                          </Typography>
                        </Tooltip>
                      </Box>
                    );
                  })}
                  <Box
                    role="cell"
                    sx={{ ...cellStyle, textAlign: "center", py: 1.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700 }}
                      color="primary.main"
                    >
                      {hoursLabel(scheduledHours)}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  role="row"
                  aria-label="Open coverage"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: columns,
                    bgcolor: "background.default",
                  }}
                >
                  <Box
                    role="rowheader"
                    sx={{
                      ...cellStyle,
                      p: 2,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: 12 }}
                    >
                      Open shifts
                    </Typography>
                    <Typography
                      variant="caption"
                      color={missing ? "warning.main" : "text.secondary"}
                    >
                      {missing
                        ? `${missing} positions to fill`
                        : "All positions filled"}
                    </Typography>
                  </Box>
                  {days.map((day) => (
                    <Stack
                      role="cell"
                      key={day}
                      spacing={1}
                      aria-label={`Open coverage ${day}`}
                      {...dayDrop(day)}
                      {...(planner
                        ? contextMenu(`Open coverage · ${day}`, [
                            pasteAction({
                              kind: "shift",
                              disabled: !pasteShift,
                              onPaste: (values) =>
                                pasteShift?.(values, day, chosen),
                            }),
                            {
                              label: "Create shift",
                              onSelect: () => createShift(day, chosen),
                            },
                          ])
                        : {})}
                      sx={{
                        ...cellStyle,
                        minHeight: 85,
                        position: "relative",
                        transition: "background-color 160ms ease",
                        "@media (prefers-reduced-motion: reduce)": {
                          transition: "none",
                        },
                        bgcolor:
                          hovered === `day-${day}-open`
                            ? "action.selected"
                            : undefined,
                        "& .add-shift": { opacity: 0 },
                        "&:hover .add-shift, &:focus-within .add-shift": {
                          opacity: 1,
                        },
                        "@media (hover: none)": {
                          "& .add-shift": { opacity: 1 },
                        },
                      }}
                    >
                      {open
                        .filter((s) => overlaps(s, day))
                        .slice(0, expandedOpenDays.has(day) ? undefined : 2)
                        .map((s) => shiftCard(s, day, true))}
                      {open.filter(s => overlaps(s, day)).length > 2 && <Button size="small" aria-label={`Show ${expandedOpenDays.has(day) ? "fewer" : "all"} open shifts on ${day}`} aria-expanded={expandedOpenDays.has(day)} onClick={() => setExpandedOpenDays(previous => { const next = new Set(previous); if (next.has(day)) next.delete(day); else next.add(day); return next; })}>{expandedOpenDays.has(day) ? "Show fewer" : `+${open.filter(s => overlaps(s, day)).length - 2} more shifts`}</Button>}
                      {planner && !open.some((s) => overlaps(s, day)) && (
                        <IconButton
                          className="add-shift"
                          aria-label={`Add shift on ${day}`}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            minWidth: 36,
                            minHeight: 36,
                          }}
                          onClick={() => createShift(day, chosen)}
                        >
                          <AddRounded sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Stack>
                  ))}
                  <Box role="cell" sx={{ ...cellStyle }} />
                </Box>
                <Box
                  role="row"
                  sx={{
                    bgcolor: "background.default",
                    display: "grid",
                    gridTemplateColumns: columns,
                  }}
                >
                  <Box
                    role="rowheader"
                    sx={{
                      ...cellStyle,
                      py: 0.75,
                      px: 2,
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Team members ({roster.length})
                    </Typography>
                  </Box>
                  {days.map((day) => (
                    <Box key={day} role="cell" sx={{ ...cellStyle, p: 0 }} />
                  ))}
                  <Box role="cell" sx={{ ...cellStyle, p: 0 }} />
                </Box>
                {roster.map((p) => (
                  <Box
                    role="row"
                    key={p.id}
                    aria-selected={chosen?.id === p.id}
                    aria-label={`${p.name}, ${hoursLabel(personHours(p.id))} scheduled`}
                    sx={{ display: "grid", gridTemplateColumns: columns }}
                  >
                    <Box
                      role="rowheader"
                      sx={{
                        ...cellStyle,
                        p: 1,
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        bgcolor: "background.paper",
                      }}
                    >
                      {employeeLabel(p)}
                    </Box>
                    {days.map((day) => (
                      <Stack
                        role="cell"
                        key={day}
                        spacing={1}
                        aria-label={`${p.name} ${day}`}
                        {...dayDrop(day, p.id)}
                        {...(planner && p.active
                          ? contextMenu(`${p.name} · ${day}`, [
                              pasteAction({
                                kind: "shift",
                                disabled: !pasteShift,
                                onPaste: (values) =>
                                  pasteShift?.(values, day, p),
                              }),
                              {
                                label: "Create shift for this employee",
                                onSelect: () => {
                                  selectEmployee(p);
                                  createShift(day, p);
                                },
                              },
                              {
                                label: "Select for scheduling",
                                onSelect: () => selectEmployee(p),
                              },
                            ])
                          : {})}
                        onClick={(event) => {
                          if (
                            !planner ||
                            !p.active ||
                            (event.target as Element).closest("button")
                          )
                            return;
                          selectEmployee(p);
                          createShift(day, p);
                        }}
                        sx={{
                          ...cellStyle,
                          minHeight: 88,
                          position: "relative",
                          cursor: planner && p.active ? "pointer" : undefined,
                          "& .create-person-shift": {
                            opacity: chosen?.id === p.id ? 1 : 0,
                          },
                          "&:hover .create-person-shift, &:focus-within .create-person-shift":
                            { opacity: 1 },
                          "@media (hover: none)": {
                            "& .create-person-shift": { opacity: 1 },
                          },
                          bgcolor:
                            chosen?.id === p.id
                              ? (theme) =>
                                  alpha(theme.palette.primary.main, 0.04)
                              : hovered === `day-${day}-${p.id}`
                                ? "action.selected"
                                : day === businessDate()
                                  ? (theme) =>
                                      alpha(theme.palette.primary.main, 0.025)
                                  : undefined,
                        }}
                      >
                        {personShifts(p.id)
                          .filter((s) => overlaps(s, day))
                          .map((s) => shiftCard(s, day))}
                        {planner &&
                          p.active &&
                          !personShifts(p.id).some((s) => overlaps(s, day)) && (
                            <Button
                              className="create-person-shift"
                              size="small"
                              startIcon={<AddRounded />}
                              aria-label={`Create shift for ${p.name} on ${day}`}
                              onClick={() => {
                                selectEmployee(p);
                                createShift(day, p);
                              }}
                              sx={{
                                fontSize: 11,
                                position: "absolute",
                                left: 4,
                                right: 4,
                                top: "50%",
                                transform: "translateY(-50%)",
                              }}
                            >
                              Create shift
                            </Button>
                          )}
                      </Stack>
                    ))}
                    <Box
                      role="cell"
                      sx={{ ...cellStyle, textAlign: "center", pt: 2 }}
                    >
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{ fontWeight: 700 }}
                      >
                        {hoursLabel(personHours(p.id))}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              {!roster.length && (
                <Typography color="text.secondary" sx={{ p: 3 }}>
                  No employees match your filters.
                </Typography>
              )}
            </Box>
          )}
        </Paper>
        {planner && summaryOpen && (
          <ScheduleStaffingSummary
            shifts={live}
            scheduledHours={scheduledHours}
            scheduledWages={scheduledWages}
            wageScope={wageScope}
            onOpenShift={setSelectedId}
          />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Hours reflect scheduled assignments in this date range, before unpaid
        breaks. Cancelled shifts are excluded from totals.
        {wageEstimates && " Wage estimates use scheduled hours × current hourly rate, without overtime, deductions or unpaid breaks."}
      </Typography>
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 3 }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-label": "Schedule filters",
            sx: { width: "min(320px, 100%)" },
          },
        }}
      >
        {filters}
      </Drawer>
      <Dialog
        open={!!selected}
        onClose={() => setSelectedId(undefined)}
        fullWidth
        maxWidth="lg"
        fullScreen={smallScreen}
        aria-labelledby="shift-details-title"
      >
        <DialogTitle id="shift-details-heading-container" component="div" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography id="shift-details-title" variant="h3">Shift details</Typography>
          <IconButton aria-label="Close shift details" onClick={() => setSelectedId(undefined)}><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent dividers>{selected && renderDetails(selected)}</DialogContent>
      </Dialog>
    </Stack>
  );
}
