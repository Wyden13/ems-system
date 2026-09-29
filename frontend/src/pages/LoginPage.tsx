import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../auth/context";
export default function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Paper sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setPending(true);
            setError("");
            try {
              await signIn(
                String(data.get("email")),
                String(data.get("password")),
              );
            } catch (failure) {
              setError((failure as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <Stack spacing={3}>
            <Typography variant="h2">Sign in to EMS</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
              required
              disabled={pending}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
            />
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
