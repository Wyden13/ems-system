import AppearanceControl from "../components/layout/AppearanceControl";
import { useEffect, useState } from "react";
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
  useEffect(() => { document.title = "Sign in | EMS"; }, []);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <>
      <div style={{ position: "absolute", top: 12, right: 16 }}><AppearanceControl /></div>
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}
    >
      <Paper sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 420 }}>
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
            {import.meta.env.VITE_DEMO_ORGANIZATION === "true" && <Alert severity="info">Prairie Market · Local demo organization</Alert>}
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
            <Typography variant="body2" color="text.secondary">Forgot your password or need access? Contact your EMS administrator for help.</Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
    </>
  );
}
