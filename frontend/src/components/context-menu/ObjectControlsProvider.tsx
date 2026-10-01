import { useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import {
  ObjectControlsContext,
  type CopiedObject,
  type ObjectDetails,
} from "./objectControls";
import { useFeedback } from "../feedback/context";

const fieldLabel = (field: string) =>
  field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());

export default function ObjectControlsProvider({
  children,
  routeKey,
}: {
  children: ReactNode;
  routeKey: string;
}) {
  const [clipboard, setClipboard] = useState<CopiedObject | null>(null);
  const [details, setDetails] = useState<
    (ObjectDetails & { routeKey: string }) | null
  >(null);
  const feedback = useFeedback();
  const visibleDetails = details?.routeKey === routeKey ? details : null;
  return (
    <ObjectControlsContext.Provider
      value={{
        clipboard,
        copy: (object) => {
          // Templates omit record identity, versions and assignments, while keeping editable relationships.
          setClipboard({ ...object, values: { ...object.values } });
          feedback(
            `Copied ${object.label}. Paste into a matching object or empty space.`,
          );
        },
        details: (object) => setDetails({ ...object, routeKey }),
      }}
    >
      {children}
      <Dialog
        open={!!visibleDetails}
        onClose={() => setDetails(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="object-details-title"
      >
        <DialogTitle id="object-details-title">
          {visibleDetails?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(120px, 1fr) 2fr" },
              gap: 1.5,
            }}
          >
            {Object.entries(visibleDetails?.values ?? {}).map(
              ([field, value]) => (
                <Box key={field} sx={{ display: "contents" }}>
                  <Typography
                    component="dt"
                    variant="body2"
                    color="text.secondary"
                  >
                    {fieldLabel(field)}
                  </Typography>
                  <Typography
                    component="dd"
                    variant="body2"
                    sx={{ m: 0, overflowWrap: "anywhere" }}
                  >
                    {value || "—"}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetails(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ObjectControlsContext.Provider>
  );
}
