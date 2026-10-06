import { useState } from "react";
import { IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import ContrastOutlined from "@mui/icons-material/ContrastOutlined";
import { useAppearance, type Appearance } from "./appearance";

export default function AppearanceControl() {
  const { appearance, setAppearance } = useAppearance();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <><Tooltip title={`Appearance: ${appearance}`}><IconButton color="inherit" aria-label="Change appearance" aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? "appearance-menu" : undefined} onClick={event => setAnchor(event.currentTarget)}><ContrastOutlined fontSize="small" /></IconButton></Tooltip><Menu id="appearance-menu" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>{(["light", "dark", "system"] as Appearance[]).map(value => <MenuItem key={value} selected={appearance === value} onClick={() => { setAppearance(value); setAnchor(null); }}>{value === "system" ? "System" : value === "light" ? "Light" : "Dark"}</MenuItem>)}</Menu></>;
}
