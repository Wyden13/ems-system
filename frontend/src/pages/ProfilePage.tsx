import { useState } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { useAuth } from "../auth/context";
import { send } from "../api/client";
import FormDialog from "../components/management/FormDialog";
export default function ProfilePage() {
  const { account, reload, signOut } = useAuth();
  const [form, setForm] = useState<"email" | "password" | null>(null);
  const [message, setMessage] = useState("");
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h2">My Profile</Typography>
        <Typography>{account?.email}</Typography>
        <Typography>Access role: {account?.role}</Typography>
        <Typography>Account status: {account?.status}</Typography>
        {message && <Alert severity="success">{message}</Alert>}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => setForm("email")}>
            Change email
          </Button>
          <Button variant="outlined" onClick={() => setForm("password")}>
            Change password
          </Button>
        </Stack>
      </Stack>
      {form === "email" && (
        <FormDialog
          title="Change email"
          fields={[
            { name: "email", label: "Email", type: "email", required: true },
          ]}
          initial={{ email: account?.email ?? "" }}
          onClose={() => setForm(null)}
          onSave={async (values) => {
            await send("/api/v1/accounts/me/profile", "PATCH", values);
            await reload();
            setMessage("Email updated.");
          }}
        />
      )}
      {form === "password" && (
        <FormDialog
          title="Change password"
          notice="This revokes refresh sessions on all devices. You will be signed out after saving. Existing access tokens expire within 15 minutes."
          fields={[
            {
              name: "currentPassword",
              label: "Current password",
              type: "password",
              required: true,
            },
            {
              name: "newPassword",
              label: "New password",
              type: "password",
              required: true,
              helper:
                "12–72 characters, with uppercase, lowercase, and numbers; no spaces",
              maxLength: 72,
            },
          ]}
          initial={{ currentPassword: "", newPassword: "" }}
          onClose={() => setForm(null)}
          onSave={async (values) => {
            await send("/api/v1/accounts/me/password", "PATCH", values);
            await signOut();
          }}
        />
      )}
    </Paper>
  );
}
