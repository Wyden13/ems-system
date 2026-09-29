import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/context";
import { api, send, params } from "../api/client";
import {
  addDays,
  businessDate,
  midnight,
  dateTime,
  parseTime,
  zonedInput,
} from "../api/attendance";
import type {
  Shift,
  Category,
  Availability,
  ScheduleOptions,
} from "../api/workflows";
import FormDialog, { type Field } from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
type Form = {
  title: string;
  fields: Field[];
  initial: Record<string, string>;
  notice?: string;
  save: (values: Record<string, string>) => Promise<unknown>;
};
export default function SchedulePage() {
  const { account } = useAuth();
  const cache = useQueryClient();
  const [from, setFrom] = useState(businessDate());
  const [form, setForm] = useState<Form | null>(null);
  const planner = account?.role !== "EMPLOYEE",
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
    queryKey: ["schedule", "shifts", from],
    enabled: !!from,
    queryFn: ({ signal }) =>
      api<Shift[]>(
        `/api/shifts?${params({ from: midnight(from), to: midnight(addDays(from, 14)) })}`,
        { signal },
      ),
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
  ) =>
    setForm({
      title,
      fields: [],
      initial: {},
      save: () => send(url, method, body),
    });
  function shiftForm(shift?: Shift) {
    setForm({
      title: shift ? "Edit shift" : "Create shift",
      notice:
        "Enter Mountain Time timestamps with the offset, e.g. 2026-10-05T09:00:00-06:00. Overnight shifts may be up to 24 hours. Remove assignments before editing a draft.",
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
        { name: "startsAt", label: "Starts at", required: true },
        { name: "endsAt", label: "Ends at", required: true },
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
        : { requiredEmployees: "1" },
      save: (v) =>
        send(
          shift ? `/api/shifts/${shift.id}` : "/api/shifts",
          shift ? "PUT" : "POST",
          {
            categoryId: Number(v.categoryId),
            departmentId: Number(v.departmentId),
            locationId: options.data?.departments.find(
              (d) => d.id === Number(v.departmentId),
            )?.locationId,
            startsAt: parseTime(v.startsAt),
            endsAt: parseTime(v.endsAt),
            requiredEmployees: Number(v.requiredEmployees),
            version: shift?.version,
          },
        ),
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
          label: "Default start (HH:mm)",
          required: true,
        },
        {
          name: "defaultEndTime",
          label: "Default end (HH:mm)",
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
    setForm({
      title: a ? "Edit availability" : "Add availability",
      notice:
        "Weekly availability uses America/Edmonton time. Explicit unavailability blocks assignments; preferred/available times are advisory. Existing commitments must be cancelled before incompatible unavailability is saved.",
      fields: [
        {
          name: "dayOfWeek",
          label: "Day",
          required: true,
          options: [
            "MONDAY",
            "TUESDAY",
            "WEDNESDAY",
            "THURSDAY",
            "FRIDAY",
            "SATURDAY",
            "SUNDAY",
          ].map((value) => ({ value, label: value })),
        },
        { name: "startTime", label: "Start time (HH:mm)", required: true },
        { name: "endTime", label: "End time (HH:mm)", required: true },
        {
          name: "type",
          label: "Availability",
          required: true,
          options: ["AVAILABLE", "UNAVAILABLE", "PREFERRED"].map((value) => ({
            value,
            label: value,
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
            dayOfWeek: "MONDAY",
            startTime: "09:00",
            endTime: "17:00",
            type: "AVAILABLE",
          },
      save: (v) =>
        send(
          a ? `/api/availability/${a.id}` : "/api/availability",
          a ? "PUT" : "POST",
          v,
        ),
    });
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h2">Schedule</Typography>
      <Alert severity="info">
        Times are shown in America/Edmonton. Scheduling does not yet deduct
        unpaid breaks or calculate attendance scores.
      </Alert>
      <Stack direction="row" spacing={2}>
        <TextField
          label="From date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {planner && (
          <Button
            variant="contained"
            disabled={!options.data || !categories.data}
            onClick={() => shiftForm()}
          >
            Create shift
          </Button>
        )}
      </Stack>
      <QueryState
        loading={shifts.isPending || options.isPending}
        error={shifts.error ?? options.error ?? categories.error}
        retry={() => {
          void shifts.refetch();
          void options.refetch();
          void categories.refetch();
        }}
      />
      {shifts.data?.length === 0 && (
        <Alert severity="info">No shifts in this 14-day range.</Alert>
      )}
      {shifts.data?.map((s) => (
        <Paper key={s.id} sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={2}>
              <Typography variant="h3">
                {s.categoryName} · Shift {s.id}
              </Typography>
              <Chip label={s.status} />
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
            {s.assignments.map((a) => (
              <Stack
                key={a.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Typography>
                  {options.data?.people.find((p) => p.id === a.employeeId)
                    ?.name ?? `Employee ${a.employeeId}`}
                  : {a.status}
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
                          )
                        }
                      >
                        Decline
                      </Button>
                    </>
                  )}
              </Stack>
            ))}
            {planner && s.status !== "CANCELLED" && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {s.status === "DRAFT" && (
                  <>
                    <Button onClick={() => shiftForm(s)}>Edit</Button>
                    <Button
                      onClick={() =>
                        confirm(
                          "Publish shift",
                          `/api/shifts/${s.id}/publish`,
                          { version: s.version },
                        )
                      }
                    >
                      Publish
                    </Button>
                  </>
                )}
                <Button
                  onClick={() =>
                    setForm({
                      title: "Assign employee",
                      fields: [
                        {
                          name: "employeeId",
                          label: "Employee",
                          required: true,
                          options: (options.data?.people ?? [])
                            .filter(
                              (p) =>
                                p.active && p.departmentId === s.departmentId,
                            )
                            .map((p) => ({
                              value: String(p.id),
                              label: `${p.name} (${p.employeeNumber})`,
                            })),
                        },
                      ],
                      initial: {},
                      save: (v) =>
                        send(`/api/shifts/${s.id}/assign`, "POST", {
                          employeeId: Number(v.employeeId),
                          version: s.version,
                        }),
                    })
                  }
                >
                  Assign employee
                </Button>
                <Button
                  color="error"
                  onClick={() =>
                    confirm("Cancel shift", `/api/shifts/${s.id}/cancel`, {
                      version: s.version,
                    })
                  }
                >
                  Cancel shift
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
      {manager && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h3">Shift categories</Typography>
            <Button onClick={() => categoryForm()}>Create category</Button>
            {categories.data?.map((c) => (
              <Stack direction="row" key={c.id}>
                <Typography sx={{ flex: 1 }}>
                  {c.name} · {c.active ? "Active" : "Inactive"}
                </Typography>
                <Button onClick={() => categoryForm(c)}>Edit {c.name}</Button>
                <Button
                  onClick={() =>
                    confirm(
                      c.active ? "Deactivate category" : "Activate category",
                      `/api/shift-categories/${c.id}/${c.active ? "deactivate" : "activate"}`,
                    )
                  }
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
      {own && (
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="h3">My weekly availability</Typography>
            <Button onClick={() => availabilityForm()}>Add availability</Button>
            <QueryState
              loading={availability.isPending}
              error={availability.error}
              retry={availability.refetch}
            />
            {availability.data?.length === 0 && (
              <Typography>No weekly preferences recorded.</Typography>
            )}
            {availability.data?.map((a) => (
              <Stack direction="row" key={a.id} spacing={1}>
                <Typography sx={{ flex: 1 }}>
                  {a.dayOfWeek} {a.startTime}–{a.endTime}: {a.type}
                </Typography>
                <Button onClick={() => availabilityForm(a)}>Edit</Button>
                <Button
                  onClick={() =>
                    confirm(
                      "Delete availability",
                      `/api/availability/${a.id}`,
                      undefined,
                      "DELETE",
                    )
                  }
                >
                  Delete
                </Button>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
      {form && (
        <FormDialog
          title={form.title}
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
