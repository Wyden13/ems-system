import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
} from "@mui/material";
import { api, send } from "../api/client";
import type { Department, Location } from "../api/types";
import FormDialog from "../components/management/FormDialog";
import QueryState from "../components/management/QueryState";
export default function OrganizationPage() {
  const cache = useQueryClient();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<{
    kind: "location" | "department";
    record?: Department | Location;
  } | null>(null);
  const [action, setAction] = useState<{
    title: string;
    path: string;
    method: string;
    notice: string;
  } | null>(null);
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: ({ signal }) => api<Location[]>("/api/locations", { signal }),
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: ({ signal }) => api<Department[]>("/api/departments", { signal }),
  });
  async function invalidate() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["departments"] }),
      cache.invalidateQueries({ queryKey: ["locations"] }),
    ]);
  }
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h2">Organization</Typography>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label="Departments" />
          <Tab label="Locations" />
        </Tabs>
        <Button
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
          disabled={locations.isPending || !!locations.error}
          onClick={() =>
            setForm({ kind: tab === 0 ? "department" : "location" })
          }
        >
          Add {tab === 0 ? "department" : "location"}
        </Button>
        <QueryState
          loading={locations.isPending || departments.isPending}
          error={locations.error || departments.error}
          retry={() => {
            void locations.refetch();
            void departments.refetch();
          }}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              {tab === 0 && (
                <>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                </>
              )}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tab === 0
              ? departments.data?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.locationName}</TableCell>
                    <TableCell>{d.archived ? "Archived" : "Active"}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() =>
                          setForm({ kind: "department", record: d })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() =>
                          setAction({
                            title: `${d.archived ? "Restore" : "Archive"} department`,
                            path: `/api/departments/${d.id}/${d.archived ? "restore" : "archive"}`,
                            method: "POST",
                            notice:
                              "Existing employee records keep their department. Archived departments cannot be selected for new assignments.",
                          })
                        }
                      >
                        {d.archived ? "Restore" : "Archive"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              : locations.data?.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>{location.name}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() =>
                          setForm({ kind: "location", record: location })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        color="error"
                        onClick={() =>
                          setAction({
                            title: "Delete location",
                            path: `/api/locations/${location.id}`,
                            method: "DELETE",
                            notice:
                              "Deletion is blocked if any active or archived department still references this location.",
                          })
                        }
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {(tab === 0 ? departments.data : locations.data)?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  No {tab === 0 ? "departments" : "locations"} yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Stack>
      {form && (
        <FormDialog
          title={`${form.record ? "Edit" : "Add"} ${form.kind}`}
          fields={[
            { name: "name", label: "Name", required: true, maxLength: 100 },
            ...(form.kind === "department"
              ? [
                  {
                    name: "locationId",
                    label: "Location",
                    required: true,
                    options: [
                      { value: "", label: "Choose a location" },
                      ...(locations.data ?? []).map((l) => ({
                        value: String(l.id),
                        label: l.name,
                      })),
                    ],
                  },
                ]
              : []),
          ]}
          initial={
            form.record
              ? {
                  name: form.record.name,
                  locationId:
                    "locationId" in form.record
                      ? String(form.record.locationId)
                      : "",
                }
              : {}
          }
          onClose={() => setForm(null)}
          onSave={async (values) => {
            await send(
              `/api/${form.kind === "department" ? "departments" : "locations"}${form.record ? `/${form.record.id}` : ""}`,
              form.record ? "PUT" : "POST",
              {
                name: values.name,
                ...(form.kind === "department"
                  ? { locationId: Number(values.locationId) }
                  : {}),
              },
            );
            await invalidate();
          }}
        />
      )}
      {action && (
        <FormDialog
          title={action.title}
          notice={action.notice}
          fields={[]}
          initial={{}}
          onClose={() => setAction(null)}
          onSave={async () => {
            await send(action.path, action.method);
            await invalidate();
          }}
        />
      )}
    </Paper>
  );
}
