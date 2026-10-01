import { createTheme, alpha } from "@mui/material/styles";

/**
 * Palette and shape are tuned to the reference HR dashboard: indigo accent,
 * soft grey canvas, white cards with a low-contrast border instead of shadows.
 */
export const INDIGO = "#5B4BE1";
export const CANVAS = "#F5F6FA";
export const BORDER = "#ECEEF4";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: INDIGO,
      dark: "#4638BE",
      light: "#8B7FEC",
      contrastText: "#FFFFFF",
    },
    secondary: { main: "#F5A524" },
    success: { main: "#137D45", light: "#E6F7EE", contrastText: "#FFFFFF" },
    warning: { main: "#9A5B00", light: "#FEF4E3", contrastText: "#FFFFFF" },
    error: { main: "#C92A34", light: "#FDECEC", contrastText: "#FFFFFF" },
    background: { default: CANVAS, paper: "#FFFFFF" },
    text: { primary: "#1C2138", secondary: "#5C6379" },
    divider: BORDER,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontSize: 28, fontWeight: 700 },
    h2: { fontSize: 28, fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: 18, fontWeight: 700 },
    h6: { fontSize: 16, fontWeight: 700 },
    subtitle2: { fontSize: 13, fontWeight: 600 },
    body1: { fontSize: 16, lineHeight: 1.5 },
    body2: { fontSize: 14, lineHeight: 1.45 },
    caption: { fontSize: 13, lineHeight: 1.45 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
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
    MuiListItemButton: { styleOverrides: { root: { minHeight: 44 } } },
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
        body: { backgroundColor: CANVAS },
        ".MuiButtonBase-root.Mui-focusVisible": {
          outline: "3px solid #4638BE",
          outlineOffset: 3,
        },
        ".MuiAppBar-root .MuiButtonBase-root.Mui-focusVisible": {
          outlineColor: "#FFFFFF",
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
        root: { backgroundImage: "none" },
        outlined: { borderColor: BORDER },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16, minHeight: 44 },
        outlined: { borderColor: "#767D94", color: "#1C2138" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 48,
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#767D94" },
        },
        input: { fontSize: 16 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BORDER, fontSize: 14 },
        head: {
          backgroundColor: "#FAFBFD",
          color: "#5C6379",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.2,
          textTransform: "uppercase",
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
        root: { borderRadius: 6, fontWeight: 600, fontSize: 12 },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: 12, borderRadius: 6 } },
    },
  },
});

export default theme;
