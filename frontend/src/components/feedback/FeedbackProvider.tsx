import { useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { FeedbackContext } from "./context";

export default function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [message, setMessage] = useState("");
  return (
    <FeedbackContext.Provider value={setMessage}>
      {children}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setMessage("");
        }}
      >
        <Alert severity="success" role="status" onClose={() => setMessage("")}>
          {message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}
