import { StatusGroups } from "../components/ui/StatusGroups";
import { workGroup } from "../components/ui/statusGrouping";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Tabs,
  Tab,
  Button,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { useAuth } from "../auth/context";
import { scheduleWagesEnabled, wageQuery } from "../api/wages";
import { api, send, params } from "../api/client";
import {
  addDays,
  businessDate,
  midnight,
  dateTime,
  parseTime,
  zonedInput,
  localTimeCandidates,
} from "../api/attendance";
import { useSearchParams } from "react-router-dom";
import { statusLabel } from "../api/workflows";
import type {
  Shift,
  Category,
  Availability,
  ScheduleOptions,
  WorkforcePerson,
  AssignmentCandidate,
} from "../api/workflows";
import FormDialog, { type Field } from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
import ScheduleCalendar from "../components/ScheduleCalendar";
import ScheduleNavigation from "../components/ScheduleNavigation";
import SchedulePreviewDialog from "../components/SchedulePreviewDialog";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import AssignmentPreviewSummary from "../components/AssignmentPreviewSummary";
import { checkAssignment } from "../api/scheduling";
import {
  availabilityError,
  weekStart,
  WEEKDAYS,
} from "../components/scheduleInteraction";
import {
  useObjectContextMenu,
  type ContextAction,
} from "../components/context-menu/context";
import { useObjectControls } from "../components/context-menu/objectControls";
import {
  shiftTemplate,
  shiftTemplateOnDay,
} from "../components/context-menu/shiftTemplate";
type Form = {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  notice?: string;
  summary?: string;
  onValuesChange?: (
    values: Record<string, string>,
    name: string,
  ) => Record<string, string>;
  validate?: (values: Record<string, string>) => Record<string, string>;
  renderSummary?: (values: Record<string, string>) => React.ReactNode;
  save: (values: Record<string, string>) => Promise<unknown>;
};
export default function SchedulePage() {
  const contextMenu = useObjectContextMenu();
  const { objectActions, showDetails } = useObjectControls();
  const { account } = useAuth();
  const cache = useQueryClient();
  const [searchParams] = useSearchParams();
  const linkedDay = searchParams.get("from");
  const [from, setFrom] = useState(
    weekStart(
      linkedDay &&
        /^\d{4}-\d{2}-\d{2}$/.test(linkedDay) &&
        Number.isFinite(Date.parse(linkedDay))
        ? linkedDay
        : businessDate(),
    ),
  );
  const [view, setView] = useState<"list" | "week">("week");
  const [section, setSection] = useState("shifts");
  const [previewOpen, setPreviewOpen] = useState(false);
  const span = view === "week" ? 7 : 14;
  const [form, setForm] = useState<Form | null>(null);
  const planner = ["SUPERVISOR", "MANAGER", "ADMIN"].includes(
      account?.role ?? "",
    ),
    manager = account?.role === "ADMIN" || account?.role === "MANAGER";
  const options = useQuery({
    queryKey: ["schedule", "options"],
    queryFn: ({ signal }) =>
      api<ScheduleOptions>("/api/shifts/options", { signal }),
  });
  const categories = useQuery({
    queryKey: ["schedule", "categories"],
    queryFn: ({ signal }) =>
      api<Category[]>("/api/shift-categories", { signal }),
  });
  const shifts = useQuery({
    queryKey: ["schedule", "shifts", from, span],
    enabled: !!from,
    queryFn: ({ signal }) =>
      api<Shift[]>(
        `/api/shifts?${params({ from: midnight(from), to: midnight(addDays(from, span)) })}`,
        { signal },
      ),
  });
  const wages = useQuery({
    queryKey: ["schedule", "wages", account?.id, account?.role, from, span],
    enabled: scheduleWagesEnabled,
    queryFn: ({ signal }) => wageQuery(from, span, signal),
  });
  const own = options.data?.people.find((p) => p.self);
  const availability = useQuery({
    queryKey: ["schedule", "availability"],
    enabled: !!own,
    queryFn: ({ signal }) =>
      api<Availability[]>("/api/availability/me", { signal }),
  });
  const confirm = (
    title: string,
    url: string,
    body?: unknown,
    method = "POST",
    summary?: string,
  ) =>
    setForm({
      title,
      summary,
      fields: [],
      initial: {},
      save: () => send(url, method, body),
    });
  const wall = (date: string, time: string) => {
    const value = `${date}T${time.length === 5 ? time + ":00" : time}`;
    const candidates = localTimeCandidates(value);
    return candidates.length === 1 ? candidates[0] : value;
  };
  const defaults = (categoryId: string, day: string) => {
    const category = categories.data?.find((c) => String(c.id) === categoryId);
    const start = category?.defaultStartTime ?? "09:00";
    const end = category?.defaultEndTime ?? "17:00";
    return {
      startsAt: wall(day, start),
      endsAt: wall(end <= start ? addDays(day, 1) : day, end),
    };
  };
  const durationSummary = (v: Record<string, string>) => {
    const hours = (Date.parse(v.endsAt) - Date.parse(v.startsAt)) / 3600000;
    return Number.isFinite(hours) && hours > 0 ? (
      <Typography role="status">
        Duration: {Number(hours.toFixed(2))} hours
        {v.startsAt.slice(0, 10) !== v.endsAt.slice(0, 10)
          ? " · overnight shift"
          : ""}
      </Typography>
    ) : null;
  };
  function shiftForm(
    shift?: Shift,
    day = from <= businessDate() && businessDate() <= addDays(from, 6)
      ? businessDate()
      : from,
    employee?: WorkforcePerson,
    template?: Record<string, string>,
  ) {
    const warningsShown = new Set<string>();
    const categoryId = String(
      shift?.shiftCategoryId ??
        template?.categoryId ??
        categories.data?.find((c) => c.active)?.id ??
        "",
    );
    setForm({
      title: shift
        ? "Edit shift"
        : employee
          ? "Create and assign shift"
          : "Create shift",
      summary: employee ? `Assigning ${employee.name}` : undefined,
      notice:
        "All times use Mountain Time. Overnight shifts may be up to 24 hours. Remove assignments before editing a draft.",
      fields: [
        {
          name: "categoryId",
          label: "Shift category",
          required: true,
          options: (categories.data ?? [])
            .filter((c) => c.active)
            .map((c) => ({ value: String(c.id), label: c.name })),
        },
        {
          name: "departmentId",
          label: "Department and location",
          required: true,
          options: (options.data?.departments ?? [])
            .filter((d) => !d.archived)
            .map((d) => ({
              value: String(d.id),
              label: `${d.name} — ${d.locationName}`,
            })),
        },
        { name: "startsAt", label: "Start", type: "datetime", required: true },
        { name: "endsAt", label: "End", type: "datetime", required: true },
        {
          name: "requiredEmployees",
          label: "Required employees",
          type: "number",
          min: "1",
          max: "1000",
          required: true,
        },
      ],
      initial: shift
        ? {
            categoryId: String(shift.shiftCategoryId),
            departmentId: String(shift.departmentId ?? ""),
            startsAt: zonedInput(shift.startsAt),
            endsAt: zonedInput(shift.endsAt),
            requiredEmployees: String(shift.requiredEmployees),
          }
        : {
            requiredEmployees: "1",
            categoryId,
            departmentId: "",
            ...defaults(categoryId, day),
            ...template,
            ...(employee
              ? { departmentId: String(employee.departmentId) }
              : {}),
          },
      onValuesChange: (v, name) =>
        name === "categoryId"
          ? { ...v, ...defaults(v.categoryId, v.startsAt.slice(0, 10) || from) }
          : v,
      renderSummary: (v) => (
        <Stack spacing={2}>
          {durationSummary(v)}
          {employee && (
            <AssignmentPreviewSummary
              candidate={candidateFor(v, employee.id)}
              onWarningShown={(candidate) =>
                warningsShown.add(JSON.stringify(candidate))
              }
            />
          )}
        </Stack>
      ),
      validate: (v): Record<string, string> => {
        const hours = (Date.parse(v.endsAt) - Date.parse(v.startsAt)) / 3600000;
        return Number.isFinite(hours) && (hours <= 0 || hours > 24)
          ? {
              endsAt:
                "End must be after start and no more than 24 hours later.",
            }
          : {};
      },
      save: async (v) => {
        const input = {
          categoryId: Number(v.categoryId),
          departmentId: Number(v.departmentId),
          locationId: options.data?.departments.find(
            (d) => d.id === Number(v.departmentId),
          )?.locationId,
          startsAt: parseTime(v.startsAt),
          endsAt: parseTime(v.endsAt),
          requiredEmployees: Number(v.requiredEmployees),
          version: shift?.version,
        };
        if (employee) {
          await validateAssignment(
            {
              employeeId: employee.id,
              departmentId: input.departmentId,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
            },
            warningsShown,
          );
          return send("/api/shifts/with-assignment", "POST", {
            shift: input,
            employeeId: employee.id,
          });
        }
        return send(
          shift ? `/api/shifts/${shift.id}` : "/api/shifts",
          shift ? "PUT" : "POST",
          input,
        );
      },
    });
  }
  function categoryForm(c?: Category) {
    setForm({
      title: c ? "Edit category" : "Create category",
      fields: [
        { name: "name", label: "Category name", required: true, maxLength: 50 },
        { name: "color", label: "Color (#RRGGBB)", required: true },
        {
          name: "defaultStartTime",
          label: "Default start",
          type: "time",
          required: true,
        },
        {
          name: "defaultEndTime",
          label: "Default end",
          type: "time",
          required: true,
        },
      ],
      initial: c
        ? {
            name: c.name,
            color: c.color ?? "#5B4BE1",
            defaultStartTime: c.defaultStartTime,
            defaultEndTime: c.defaultEndTime,
          }
        : {
            color: "#5B4BE1",
            defaultStartTime: "09:00",
            defaultEndTime: "17:00",
          },
      save: (v) =>
        send(
          c ? `/api/shift-categories/${c.id}` : "/api/shift-categories",
          c ? "PUT" : "POST",
          v,
        ),
    });
  }
  function availabilityForm(a?: Availability) {
    const editing = a !== undefined && a.id >= 0;
    setForm({
      title: editing ? "Edit availability" : "Add availability",
      notice:
        "Weekly availability uses America/Edmonton time. Explicit unavailability blocks assignments; preferred/available times are advisory. Existing commitments must be cancelled before incompatible unavailability is saved.",
      fields: [
        {
          name: "dayOfWeek",
          label: "Day",
          required: true,
          options: WEEKDAYS.map((value) => ({
            value,
            label: statusLabel(value),
          })),
        },
        {
          name: "startTime",
          label: "Start time",
          type: "time",
          required: true,
        },
        { name: "endTime", label: "End time", type: "time", required: true },
        {
          name: "type",
          label: "Availability",
          required: true,
          options: ["AVAILABLE", "UNAVAILABLE", "PREFERRED"].map((value) => ({
            value,
            label: statusLabel(value),
          })),
        },
      ],
      initial: a
        ? {
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            type: a.type,
          }
        : {
            dayOfWeek: "SATURDAY",
            startTime: "09:00",
            endTime: "17:00",
            type: "AVAILABLE",
          },
      validate: (v): Record<string, string> => {
        const error = availabilityError(
          {
            dayOfWeek: v.dayOfWeek,
            startTime: v.startTime,
            endTime: v.endTime,
            type: v.type,
          },
          availability.data ?? [],
          editing ? a.id : undefined,
        );
        return error ? { endTime: error } : {};
      },
      save: (v) =>
        send(
          editing ? `/api/availability/${a.id}` : "/api/availability",
          editing ? "PUT" : "POST",
          v,
        ),
    });
  }
  const candidateFor = (
    v: Record<string, string>,
    employeeId: number,
  ): AssignmentCandidate | undefined => {
    try {
      const startsAt = parseTime(v.startsAt),
        endsAt = parseTime(v.endsAt);
      if (
        !v.departmentId ||
        Date.parse(endsAt) <= Date.parse(startsAt) ||
        Date.parse(endsAt) - Date.parse(startsAt) > 86400000
      )
        return undefined;
      return {
        employeeId,
        departmentId: Number(v.departmentId),
        startsAt,
        endsAt,
      };
    } catch {
      return undefined;
    }
  };
  const validateAssignment = async (
    candidate: AssignmentCandidate,
    warningsShown: Set<string>,
  ) => {
    const preview = await checkAssignment(candidate);
    if (preview.state === "BLOCKED") throw new Error(preview.reasons.join(" "));
    if (
      preview.state === "WARNING" &&
      !warningsShown.has(JSON.stringify(candidate))
    ) {
      warningsShown.add(JSON.stringify(candidate));
      throw new Error(
        `Availability warning: ${preview.reasons.join(" ")} Review this warning and submit again to proceed.`,
      );
    }
  };
  function assignForm(s: Shift, employee?: WorkforcePerson) {
    const warningsShown = new Set<string>();
    setForm({
      title: "Assign employee",
      summary: `${employee ? employee.name + " · " : ""}${shiftContext(s)}`,
      fields: employee
        ? []
        : [
            {
              name: "employeeId",
              label: "Employee",
              required: true,
              options: (options.data?.people ?? [])
                .filter((p) => p.active && p.departmentId === s.departmentId)
                .map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${p.employeeNumber})`,
                })),
            },
          ],
      initial: { employeeId: employee ? String(employee.id) : "" },
      renderSummary: (v) => (
        <AssignmentPreviewSummary
          candidate={
            v.employeeId
              ? { employeeId: Number(v.employeeId), shiftId: s.id }
              : undefined
          }
          onWarningShown={(candidate) =>
            warningsShown.add(JSON.stringify(candidate))
          }
        />
      ),
      save: async (v) => {
        await validateAssignment(
          { employeeId: Number(v.employeeId), shiftId: s.id },
          warningsShown,
        );
        return send(`/api/shifts/${s.id}/assign`, "POST", {
          employeeId: Number(v.employeeId),
          version: s.version,
        });
      },
    });
  }
  const visibleShifts = shifts.data ?? [];
  const shiftContext = (s: Shift) =>
    `${s.categoryName} · ${dateTime(s.startsAt)} – ${dateTime(s.endsAt)} · ${options.data?.departments.find((d) => d.id === s.departmentId)?.name ?? "Department"}`;
  const pasteShift = (
    values: Record<string, string>,
    day: string,
    employee?: WorkforcePerson,
  ) => shiftForm(undefined, day, employee, shiftTemplateOnDay(values, day));
  const shiftActions = (
    s: Shift,
    details?: () => void,
    day = businessDate(new Date(s.startsAt)),
  ): ContextAction[] =>
    objectActions({
      copy: {
        kind: "shift",
        label: `${s.categoryName} shift`,
        values: shiftTemplate(s),
      },
      paste: {
        kind: "shift",
        disabled: !planner,
        reason: "Only planners can create shifts.",
        onPaste: (values) => pasteShift(values, day),
      },
      edit: planner && s.status === "DRAFT" ? () => shiftForm(s) : undefined,
      editReason: !planner
        ? "Only planners can edit shifts."
        : "Only draft shifts can be edited.",
      deleteReason: "Use Cancel shift in Details to retain scheduling history.",
      details:
        details ??
        (() =>
          showDetails("Shift details", {
            category: s.categoryName,
            start: dateTime(s.startsAt),
            end: dateTime(s.endsAt),
            status: statusLabel(s.status),
            requiredEmployees: String(s.requiredEmployees),
          })),
    });
  const renderShift = (s: Shift, viewDetails?: () => void) => (
    <Paper
      key={s.id}
      {...contextMenu(
        `${s.categoryName} · Shift ${s.id}`,
        shiftActions(s, viewDetails),
      )}
      id={`shift-${s.id}`}
      variant="outlined"
      sx={{
        p: 2,
        scrollMarginTop: 96,
        borderColor:
          searchParams.get("shift") === String(s.id)
            ? "primary.main"
            : "divider",
      }}
    >
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Typography variant="h3">
            {s.categoryName} · Shift {s.id}
          </Typography>
          <Chip label={statusLabel(s.status)} />
        </Stack>
        <Typography>
          {dateTime(s.startsAt)} – {dateTime(s.endsAt)}
        </Typography>
        <Typography>
          {options.data?.departments.find((d) => d.id === s.departmentId)
            ?.name ??
            (s.departmentId
              ? `Department ${s.departmentId}`
              : "Department required")}{" "}
          ·{" "}
          {
            s.assignments.filter((a) =>
              ["ASSIGNED", "ACCEPTED"].includes(a.status),
            ).length
          }
          /{s.requiredEmployees} staffed
        </Typography>
        <StatusGroups items={s.assignments} category={a => workGroup(a.status)}>{a => (
          <Stack
            key={a.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography>
              {options.data?.people.find((p) => p.id === a.employeeId)?.name ??
                `Employee ${a.employeeId}`}
              : {statusLabel(a.status)}
            </Typography>
            {planner &&
              s.status !== "CANCELLED" &&
              ["ASSIGNED", "ACCEPTED"].includes(a.status) && (
                <Button
                  onClick={() =>
                    confirm(
                      "Remove assignment",
                      `/api/shift-assignments/${a.id}/cancel`,
                      { version: a.version },
                      "POST",
                      `${options.data?.people.find((p) => p.id === a.employeeId)?.name ?? "Employee"} · ${shiftContext(s)}`,
                    )
                  }
                >
                  Remove
                </Button>
              )}
            {a.employeeId === own?.id &&
              s.status === "PUBLISHED" &&
              ["ASSIGNED", "ACCEPTED"].includes(a.status) && (
                <>
                  <Button
                    onClick={() =>
                      confirm(
                        "Accept shift",
                        `/api/shifts/${s.id}/respond`,
                        { status: "ACCEPTED", version: a.version },
                        "POST",
                        shiftContext(s),
                      )
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() =>
                      confirm(
                        "Decline shift",
                        `/api/shifts/${s.id}/respond`,
                        { status: "DECLINED", version: a.version },
                        "POST",
                        shiftContext(s),
                      )
                    }
                  >
                    Decline
                  </Button>
                </>
              )}
          </Stack>
        )}</StatusGroups>
        {planner && s.status !== "CANCELLED" && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {s.status === "DRAFT" && (
              <>
                <Button onClick={() => shiftForm(s)}>Edit</Button>
                <Button
                  onClick={() =>
                    confirm(
                      "Publish shift",
                      `/api/shifts/${s.id}/publish`,
                      { version: s.version },
                      "POST",
                      shiftContext(s),
                    )
                  }
                >
                  Publish
                </Button>
              </>
            )}
            <Button onClick={() => assignForm(s)}>Assign employee</Button>
            <Button
              color="error"
              onClick={() =>
                confirm(
                  "Cancel shift",
                  `/api/shifts/${s.id}/cancel`,
                  {
                    version: s.version,
                  },
                  "POST",
                  shiftContext(s),
                )
              }
            >
              Cancel shift
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h2">Schedule</Typography>
          {/* <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Plan your team’s week and keep every shift covered.
          </Typography> */}
        </Box>
        {section === "shifts" && planner && (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            disabled={!options.data || !categories.data}
            onClick={() => shiftForm()}
          >
            Create shift
          </Button>
        )}
      </Stack>
      <Tabs
        value={section}
        onChange={(_, value) => setSection(value)}
        variant="scrollable"
        aria-label="Schedule sections"
      >
        <Tab value="shifts" label="Shifts" />
        {own && <Tab value="availability" label="My availability" />}
        {manager && <Tab value="categories" label="Shift categories" />}
      </Tabs>
      <QueryState
        loading={shifts.isPending || options.isPending}
        error={shifts.error ?? options.error ?? categories.error}
        retry={() => {
          void shifts.refetch();
          void options.refetch();
          void categories.refetch();
        }}
      />
      {previewOpen && shifts.data && options.data && (
        <SchedulePreviewDialog
          shifts={shifts.data}
          options={options.data}
          from={from}
          span={span}
          showCoverage={planner}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {section === "shifts" && shifts.data?.length === 0 && (
        <Alert severity="info">
          No shifts in this {span}-day range.{" "}
          {planner
            ? "Create a shift to start planning."
            : "Check another range or contact your supervisor."}
        </Alert>
      )}
      {section === "shifts" && wages.error && <Alert severity="warning" action={<Button onClick={() => void wages.refetch()}>Retry</Button>}>Wage estimates are temporarily unavailable. Scheduling is still available.</Alert>}
      {section === "shifts" && (
        <ScheduleCalendar
          from={from}
          shifts={visibleShifts}
          options={options.data}
          categories={categories.data}
          planner={planner}
          view={view}
          wageEstimates={wages.data?.estimates}
          wageScope={manager ? "team" : "self"}
          navigationControls={
            <ScheduleNavigation
              from={from}
              view={view}
              onFromChange={setFrom}
              onViewChange={setView}
              onPreview={() => setPreviewOpen(true)}
              previewDisabled={
                !shifts.data ||
                !options.data ||
                shifts.isFetching ||
                !!shifts.error ||
                !!options.error
              }
            />
          }
          initialShiftId={Number(searchParams.get("shift")) || undefined}
          renderShift={renderShift}
          createShift={(day, employee) => shiftForm(undefined, day, employee)}
          assignEmployee={assignForm}
          shiftActions={shiftActions}
          pasteShift={pasteShift}
        />
      )}

      {manager && section === "categories" && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h3">Shift categories</Typography>
            <Button
              sx={{ alignSelf: "flex-start" }}
              onClick={() => categoryForm()}
            >
              Create category
            </Button>
            <StatusGroups items={categories.data ?? []} category={c => c.active ? "Active" : "Inactive"}>{c => (
              <Stack direction={{ xs: "column", sm: "row" }} key={c.id}>
                <Typography sx={{ flex: 1 }}>
                  {c.name} · {c.active ? "Active" : "Inactive"}
                </Typography>
                <Button onClick={() => categoryForm(c)}>Edit {c.name}</Button>
                <Button
                  onClick={() =>
                    confirm(
                      c.active ? "Deactivate category" : "Activate category",
                      `/api/shift-categories/${c.id}/${c.active ? "deactivate" : "activate"}`,
                      undefined,
                      "POST",
                      c.name,
                    )
                  }
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Button>
              </Stack>
            )}</StatusGroups>
          </Stack>
        </Paper>
      )}
      {own && section === "availability" && (
        <Stack spacing={2}>
          <QueryState
            loading={availability.isPending}
            error={availability.error}
            retry={availability.refetch}
          />
          {!availability.error && (
            <AvailabilityCalendar
              entries={availability.data ?? []}
              loading={availability.isPending}
              onEdit={availabilityForm}
              onDelete={(a) =>
                confirm(
                  "Delete availability",
                  `/api/availability/${a.id}`,
                  undefined,
                  "DELETE",
                  `${statusLabel(a.dayOfWeek)} · ${a.startTime}–${a.endTime} · ${statusLabel(a.type)}`,
                )
              }
              onSave={async (a) => {
                const { dayOfWeek, startTime, endTime, type } = a;
                await send(
                  a.id < 0 ? "/api/availability" : `/api/availability/${a.id}`,
                  a.id < 0 ? "POST" : "PUT",
                  { dayOfWeek, startTime, endTime, type },
                );
                await cache.invalidateQueries({ queryKey: ["schedule"] });
              }}
            />
          )}
        </Stack>
      )}
      {form && (
        <FormDialog
          title={form.title}
          submitLabel={
            form.title.startsWith("Edit")
              ? form.title.replace("Edit", "Save")
              : form.title
          }
          pendingLabel="Submitting…"
          cancelLabel={form.title === "Cancel shift" ? "Keep shift" : "Cancel"}
          submitColor={
            /^(Cancel|Delete|Remove|Decline|Deactivate)/.test(form.title)
              ? "error"
              : "primary"
          }
          summary={
            form.summary ? <Typography>{form.summary}</Typography> : undefined
          }
          renderSummary={form.renderSummary}
          validate={form.validate}
          onValuesChange={form.onValuesChange}
          successMessage={`${form.title} completed.`}
          fields={form.fields}
          initial={form.initial}
          notice={form.notice}
          onClose={() => setForm(null)}
          onSave={async (v) => {
            await form.save(v);
            await Promise.all([
              cache.invalidateQueries({ queryKey: ["schedule"] }),
              cache.invalidateQueries({ queryKey: ["pto"] }),
              cache.invalidateQueries({ queryKey: ["work-dashboard"] }),
            ]);
          }}
        />
      )}
    </Stack>
  );
}
