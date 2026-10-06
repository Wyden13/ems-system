import { useMemo, useState, type ReactNode } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { createAppTheme } from "../../theme";

import { AppearanceContext, type Appearance } from "./appearance";

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, update] = useState<Appearance>(() => {
    try {
      const saved = localStorage.getItem("ems-appearance");
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch { return "system"; }
  });
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const mode = appearance === "system" ? systemDark ? "dark" : "light" : appearance;
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ appearance, setAppearance: (next: Appearance) => {
    update(next);
    try { localStorage.setItem("ems-appearance", next); } catch { /* Current session still uses the selected appearance. */ }
  } }), [appearance]);
  return <AppearanceContext.Provider value={value}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></AppearanceContext.Provider>;
}
