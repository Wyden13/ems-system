import type { Palette } from "@mui/material/styles";
import type { WorkforcePerson } from "../api/workflows";

/** A self-contained drag image avoids WebKit capturing the scrollable employee list. */
export function employeeDragPreview(person: WorkforcePerson, palette: Palette) {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 64;
  canvas.dataset.employeeDragPreview = String(person.id);
  canvas.setAttribute("aria-hidden", "true");
  // Keep the canvas mounted for Safari's deferred drag-image capture. Its painted
  // pixels are independent of the source button and its scrolling ancestors.
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "240px",
    height: "64px",
    pointerEvents: "none",
    zIndex: "-1",
  });
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.fillStyle = palette.background.paper;
  ctx.strokeStyle = palette.primary.main;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(1, 1, 238, 62, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.primary.light;
  ctx.beginPath();
  ctx.arc(30, 32, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "600 12px system-ui";
  ctx.fillStyle = palette.primary.main;
  ctx.textAlign = "center";
  ctx.fillText(
    person.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join(""),
    30,
    36,
  );
  ctx.textAlign = "left";
  ctx.font = "600 13px system-ui";
  ctx.fillStyle = palette.text.primary;
  let label = person.name;
  if (ctx.measureText(label).width > 172) {
    while (label.length && ctx.measureText(`${label}…`).width > 172)
      label = label.slice(0, -1);
    label += "…";
  }
  ctx.fillText(label, 56, 28);
  ctx.font = "12px system-ui";
  ctx.fillStyle = palette.text.secondary;
  ctx.fillText(person.employeeNumber, 56, 46, 172);
  document.body.append(canvas);
  return canvas;
}
