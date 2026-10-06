import { createTheme, alpha } from "@mui/material/styles";

/** Shared compact surfaces and semantic colors for workforce operations. */
export const INDIGO = "#5B4BE1";
export const CANVAS = "#FAFAFA";
export const BORDER = "#E4E4E7";

export function createAppTheme(mode: "light" | "dark") {
  const dark = mode === "dark";
  const border = dark ? "#303036" : BORDER;
  const canvas = dark ? "#111113" : CANVAS;
  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? "#A99BFF" : INDIGO,
        dark: dark ? "#C4BAFF" : "#4638BE",
        light: dark ? "#292340" : "#EEEBFF",
        contrastText: dark ? "#171320" : "#FFFFFF",
      },
      secondary: { main: "#F5A524" },
      info: { main: dark ? "#78B7FF" : "#1769AA", light: dark ? "#172A40" : "#EAF4FF" },
      success: { main: dark ? "#6DD99A" : "#137D45", light: dark ? "#162D20" : "#E6F7EE", contrastText: dark ? "#111113" : "#FFFFFF" },
      warning: { main: dark ? "#EFC076" : "#9A5B00", light: dark ? "#322718" : "#FEF4E3", contrastText: dark ? "#111113" : "#FFFFFF" },
      error: { main: dark ? "#FF9097" : "#C92A34", light: dark ? "#351D21" : "#FDECEC", contrastText: dark ? "#111113" : "#FFFFFF" },
      background: { default: canvas, paper: dark ? "#18181B" : "#FFFFFF" },
      text: { primary: dark ? "#F4F4F5" : "#18181B", secondary: dark ? "#A1A1AA" : "#62626C" },
      divider: border,
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily:
        '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      h1: { fontSize: 28, fontWeight: 700 },
      h2: { fontSize: 26, fontWeight: 650, lineHeight: 1.25, letterSpacing: -0.7 },
      h3: { fontSize: 16, fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: 16, fontWeight: 700 },
      subtitle2: { fontSize: 13, fontWeight: 600 },
      body1: { fontSize: 14, lineHeight: 1.5 },
      body2: { fontSize: 14, lineHeight: 1.45 },
      caption: { fontSize: 13, lineHeight: 1.45 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiAlert: {
        styleOverrides: {
          standard: {
            color: dark ? "#F4F4F5" : "#18181B",
            "&.MuiAlert-colorWarning": { backgroundColor: dark ? "#322718" : "#FEF4E3" },
            "&.MuiAlert-colorSuccess": { backgroundColor: dark ? "#162D20" : "#E6F7EE" },
            "&.MuiAlert-colorError": { backgroundColor: dark ? "#351D21" : "#FDECEC" },
            "&.MuiAlert-colorInfo": { backgroundColor: dark ? "#172A40" : "#EAF4FF" },
          },
        },
      },
      MuiTypography: {
        defaultProps: {
          variantMapping: {
            h1: "h1",
            h2: "h1",
            h3: "h2",
            h4: "h3",
            h5: "h4",
            h6: "p",
            subtitle1: "p",
            subtitle2: "p",
            body1: "p",
            body2: "p",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
      },
      MuiToggleButton: { styleOverrides: { root: { minHeight: 44 } } },
      MuiListItemButton: { styleOverrides: { root: { minHeight: 36, "@media (pointer: coarse), (max-width: 599px)": { minHeight: 44 } } } },
      MuiDialogContent: { styleOverrides: { root: { padding: 24 } } },
      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "16px 24px", gap: 8, flexWrap: "wrap" },
        },
      },
      MuiTableContainer: {
        styleOverrides: { root: { maxWidth: "100%", overflowX: "auto" } },
      },
      MuiCssBaseline: {
        styleOverrides: {
          "html, body, #root": { height: "100%" },
          body: { backgroundColor: canvas, colorScheme: mode },
          ".MuiButtonBase-root.Mui-focusVisible": {
            outline: `2px solid ${dark ? "#A99BFF" : INDIGO}`,
            outlineOffset: 3,
          },
          ".MuiAppBar-root .MuiButtonBase-root.Mui-focusVisible": {
            outlineColor: dark ? "#A99BFF" : INDIGO,
          },
          "@media (max-width: 599px)": { ".MuiTypography-h2": { fontSize: 24 } },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              transition: "none !important",
              animation: "none !important",
              scrollBehavior: "auto !important",
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: "none", border: `1px solid ${border}` },
          outlined: { borderColor: border },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 4, paddingInline: 12, minHeight: 34, "@media (pointer: coarse), (max-width: 599px)": { minHeight: 44 } },
          outlined: { borderColor: border, color: dark ? "#F4F4F5" : "#18181B" },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: 40,
            backgroundColor: dark ? "#18181B" : "#FFFFFF",
            borderRadius: 4,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: dark ? "#62626C" : "#A1A1AA" },
          },
          input: { fontSize: 14, "@media (pointer: coarse), (max-width: 599px)": { fontSize: 16 } },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: border, fontSize: 13, padding: "8px 12px", "& .MuiButton-root": { minHeight: 30, fontSize: 12, paddingInline: 8 }, "@media (pointer: coarse), (max-width: 599px)": { "& .MuiButton-root": { minHeight: 44 } } },
          head: {
            backgroundColor: dark ? "#202024" : "#F7F7F8",
            color: dark ? "#A1A1AA" : "#62626C",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: 0.2,
            textTransform: "none",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { "&:hover": { backgroundColor: alpha(INDIGO, 0.03) } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 4, fontWeight: 500, fontSize: 12, height: 26 }, sizeSmall: { height: 22 },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: 12, borderRadius: 6 } },
      },
    },
  });
}

export default createAppTheme("light");
