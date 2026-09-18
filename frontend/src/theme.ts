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
    success: { main: "#1FB865", light: "#E6F7EE" },
    warning: { main: "#F5A524", light: "#FEF4E3" },
    error: { main: "#E5484D", light: "#FDECEC" },
    background: { default: CANVAS, paper: "#FFFFFF" },
    text: { primary: "#1C2138", secondary: "#8A90A6" },
    divider: BORDER,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontSize: 28, fontWeight: 700 },
    h2: { fontSize: 22, fontWeight: 700 },
    h3: { fontSize: 18, fontWeight: 700 },
    h6: { fontSize: 16, fontWeight: 700 },
    subtitle2: { fontSize: 13, fontWeight: 600 },
    body1: { fontSize: 14 },
    body2: { fontSize: 13 },
    caption: { fontSize: 12 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": { height: "100%" },
        body: { backgroundColor: CANVAS },
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
        root: { borderRadius: 8, paddingInline: 16 },
        outlined: { borderColor: BORDER, color: "#1C2138" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
        },
        input: { fontSize: 13 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BORDER, fontSize: 13 },
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
