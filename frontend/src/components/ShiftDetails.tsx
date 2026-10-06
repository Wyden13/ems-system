import { useRef, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { send } from "../api/client";
import ShiftSummary from "./ShiftSummary";
import { checkAssignment, previewKey } from "../api/scheduling";
import { statusLabel, type ScheduleOptions, type Shift, type WorkforcePerson } from "../api/workflows";
import { activeAssignments } from "./scheduleRoster";
export default function ShiftDetails({ shift, options, planner, onEdit, onPublish, onCancel }: {
    shift: Shift;
    options?: ScheduleOptions;
    planner: boolean;
    onEdit: () => void;
    onPublish: () => void;
    onCancel: () => void;
}) {
    const cache = useQueryClient();
    const [location, setLocation] = useState(String(shift.locationId));
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [busy, setBusy] = useState(false);
    const locked = useRef(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [warning, setWarning] = useState<{
        employeeId: number;
        reasons: string;
        version: number;
    }>();
    const assigned = activeAssignments(shift);
    const locations = new Map(options?.departments.map(d => [String(d.locationId), d.locationName]));
    if (!locations.has(String(shift.locationId)))
        locations.set(String(shift.locationId), `Location ${shift.locationId}`);
    const people: WorkforcePerson[] = [...(options?.people ?? [])];
    for (const assignment of shift.assignments) {
        if (!people.some(p => p.id === assignment.employeeId))
            people.push({ id: assignment.employeeId, name: `Employee ${assignment.employeeId}`, employeeNumber: "", departmentId: 0, active: false, self: false });
    }
    const roster = people.filter(p => {
        const isAssigned = assigned.some(a => a.employeeId === p.id);
        const personLocation = options?.departments.find(d => d.id === p.departmentId)?.locationId;
        return (isAssigned || ((!location || String(personLocation) === location) && (p.active || shift.assignments.some(a => a.employeeId === p.id))))
            && `${p.name} ${p.employeeNumber}`.toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => Number(assigned.some(x => x.employeeId === b.id)) - Number(assigned.some(x => x.employeeId === a.id)) || a.name.localeCompare(b.name));
    const candidates = roster.filter(p => planner && p.active && p.departmentId === shift.departmentId && shift.status !== "CANCELLED" && !assigned.some(a => a.employeeId === p.id));
    const previews = useQueries({ queries: candidates.map(p => ({
            queryKey: previewKey({ employeeId: p.id, shiftId: shift.id }),
            queryFn: ({ signal }: {
                signal: AbortSignal;
            }) => checkAssignment({ employeeId: p.id, shiftId: shift.id }, signal),
            staleTime: 15000,
            retry: false,
        })) });
    function eligibility(p: WorkforcePerson) {
        if (assigned.some(a => a.employeeId === p.id))
            return { label: "On this shift", reason: "", state: "assigned" };
        if (!planner)
            return { label: "Not checked", reason: "", state: "unknown" };
        if (!p.active)
            return { label: "Inactive", reason: "Only active staff can be assigned.", state: "blocked" };
        if (p.departmentId !== shift.departmentId)
            return { label: "Different department", reason: "Staff must belong to the shift's department.", state: "blocked" };
        if (shift.status === "CANCELLED")
            return { label: "Cancelled shift", reason: "", state: "blocked" };
        const preview = previews[candidates.findIndex(c => c.id === p.id)];
        if (!preview || preview.isPending)
            return { label: "Checking…", reason: "", state: "checking" };
        if (preview.error)
            return { label: "Check failed", reason: "Retry before assigning.", state: "error" };
        return { label: preview.data.state === "AVAILABLE" ? "Available" : preview.data.state === "WARNING" ? "Availability warning" : "Conflict / unavailable", reason: preview.data.reasons.join(" "), state: preview.data.state.toLowerCase() };
    }
    async function mutate(action: () => Promise<unknown>, message: string) {
        if (locked.current)
            return;
        locked.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await action();
            await cache.invalidateQueries({ queryKey: ["schedule"] });
            setNotice(message);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Could not save. Please retry.");
            await cache.invalidateQueries({ queryKey: ["schedule"] });
        }
        finally {
            locked.current = false;
            setBusy(false);
        }
    }
    async function assign(p: WorkforcePerson) {
        await mutate(async () => {
            const preview = await checkAssignment({ employeeId: p.id, shiftId: shift.id });
            if (preview.state === "BLOCKED")
                throw new Error(preview.reasons.join(" "));
            const reasons = preview.reasons.join(" ");
            if (preview.state === "WARNING" && !(warning?.employeeId === p.id && warning.reasons === reasons && warning.version === shift.version)) {
                setWarning({ employeeId: p.id, reasons, version: shift.version });
                throw new Error(`${reasons} Select “Assign anyway” to proceed.`);
            }
            await send(`/api/shifts/${shift.id}/assign`, "POST", { employeeId: p.id, version: shift.version });
            setWarning(undefined);
        }, `${p.name} assigned.`);
    }
    const visible = roster.filter(p => {
        const state = eligibility(p).state;
        return filter === "all" || (filter === "assigned" ? state === "assigned" : filter === "available" ? state === "available" : state === "blocked" || state === "warning");
    });
    return <Stack spacing={3}>
    <ShiftSummary shift={shift} options={options} />
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    {notice && <Alert severity="success" role="status">{notice}</Alert>}
    <Stack spacing={2}>
      <Typography variant="h3">Staff</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField size="small" label="Search staff" value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1 }}/>
        {planner && <TextField select size="small" label="Staff location" value={location} onChange={e => setLocation(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All locations</MenuItem>{[...locations].map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}</TextField>}
        <TextField select size="small" label="Staff status" value={filter} onChange={e => setFilter(e.target.value)} sx={{ minWidth: 170 }}>{[["all", "All staff"], ["assigned", "Assigned"], ["available", "Available"], ["conflicts", "Conflicts / warnings"]].map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}</TextField>
      </Stack>
      {planner && <Typography variant="body2" color="text.secondary">Assigned staff remain included across location filters. Actions save immediately.</Typography>}
      <TableContainer sx={{ maxHeight: 400 }}><Table stickyHeader aria-label="Shift staff">
        <TableHead><TableRow><TableCell>Staff member</TableCell><TableCell>Department</TableCell><TableCell>Assignment</TableCell><TableCell>Availability</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
        <TableBody>{visible.map(p => {
            const assignment = assigned.find(a => a.employeeId === p.id);
            const previous = [...shift.assignments].reverse().find(a => a.employeeId === p.id);
            const status = eligibility(p);
            return <TableRow key={p.id}>
            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.employeeNumber}</Typography></TableCell>
            <TableCell>{options?.departments.find(d => d.id === p.departmentId)?.name ?? "—"}</TableCell>
            <TableCell>{assignment ? statusLabel(assignment.status) : previous ? statusLabel(previous.status) : "Not assigned"}</TableCell>
            <TableCell><Chip size="small" label={status.label} color={status.state === "available" ? "success" : status.state === "warning" ? "warning" : status.state === "blocked" || status.state === "error" ? "error" : "default"}/><Typography variant="caption" sx={{ display: "block", mt: .5, maxWidth: 280 }}>{status.reason}</Typography>{status.state === "error" && <Button size="small" disabled={busy} onClick={() => void previews[candidates.findIndex(c => c.id === p.id)]?.refetch()}>Retry</Button>}</TableCell>
            <TableCell align="right">
              {planner && shift.status !== "CANCELLED" && (assignment ? <Button size="small" disabled={busy} onClick={() => void mutate(() => send(`/api/shift-assignments/${assignment.id}/cancel`, "POST", { version: assignment.version }), `${p.name} removed.`)}>Remove</Button> : <Button size="small" disabled={busy || assigned.length >= shift.requiredEmployees || !["available", "warning"].includes(status.state)} onClick={() => void assign(p)}>{warning?.employeeId === p.id && warning.version === shift.version ? "Assign anyway" : "Assign"}</Button>)}
              {p.self && assignment && shift.status === "PUBLISHED" && <Stack>{["ACCEPTED", "DECLINED"].map(response => <Button key={response} size="small" disabled={busy} onClick={() => void mutate(() => send(`/api/shifts/${shift.id}/respond`, "POST", { status: response, version: assignment.version }), `Shift ${statusLabel(response).toLowerCase()}.`)}>{response === "ACCEPTED" ? "Accept" : "Decline"}</Button>)}</Stack>}
            </TableCell>
          </TableRow>;
        })}{!visible.length && <TableRow><TableCell colSpan={5}>No staff match these filters.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>
    </Stack>
    {planner && shift.status !== "CANCELLED" && <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
      <Button color="error" disabled={busy} onClick={onCancel}>Cancel shift</Button>
      {shift.status === "DRAFT" && <><Button disabled={busy} onClick={onEdit}>Edit</Button><Button variant="contained" disabled={busy} onClick={onPublish}>Publish</Button></>}
    </Stack>}
  </Stack>;
}
