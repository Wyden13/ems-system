import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Autocomplete, Button, Stack, TextField } from "@mui/material";
import { api, params } from "../../api/client";
import { type Account, type Page } from "../../api/types";
import { statusLabel } from "../../api/workflows";
import { useAuth } from "../../auth/context";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function AccountPicker({
  value,
  onChange,
  disabled,
  error,
  helper,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  error?: boolean;
  helper?: string;
  label: string;
}) {
  const { account } = useAuth();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search);
  const result = useQuery({
    queryKey: ["account-options", account?.id, term],
    enabled: !disabled,
    queryFn: ({ signal }) =>
      api<Page<Account>>(
        `/api/v1/admin/accounts?${params({ search: term, page: 0, size: 20 })}`,
        { signal },
      ),
  });
  const selected = useQuery({
    queryKey: ["account-option", account?.id, value],
    enabled: !!value,
    queryFn: ({ signal }) =>
      api<Account>(`/api/v1/admin/accounts/${value}`, { signal }),
  });
  const failure = result.error ?? selected.error;
  const records = result.data?.content ?? [];
  const chosen = selected.data ?? records.find((a) => a.id === value) ?? null;
  const options =
    chosen && !records.some((a) => a.id === chosen.id)
      ? [chosen, ...records]
      : records;
  return (
    <Stack spacing={1}>
      <Autocomplete
        options={options}
        value={chosen}
        disabled={disabled || !!selected.error}
        loading={result.isFetching || selected.isFetching}
        filterOptions={(items) => items}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        getOptionLabel={(a) =>
          `${a.email} (${statusLabel(a.role)}, ${statusLabel(a.status)})`
        }
        onInputChange={(_, text, reason) => {
          if (reason === "input" || reason === "clear") setSearch(text);
        }}
        onChange={(_, next) => onChange(next?.id ?? "")}
        noOptionsText={
          result.isFetching ? "Searching accounts…" : "No matching accounts"
        }
        renderInput={(props) => (
          <TextField
            {...props}
            label={label}
            error={error || !!failure}
            helperText={
              helper ??
              "Search by email. Leave empty if no login access is needed."
            }
          />
        )}
      />
      {result.data && result.data.totalElements > 20 && (
        <Alert severity="info">
          Showing the first 20 matches. Type an email to narrow the search.
        </Alert>
      )}
      {failure && (
        <Alert
          severity="error"
          action={
            <Button
              onClick={() => {
                void result.refetch();
                if (value) void selected.refetch();
              }}
            >
              Retry
            </Button>
          }
        >
          Could not load login accounts. Your selection is unchanged.
        </Alert>
      )}
    </Stack>
  );
}
