import { Fragment, type ReactNode } from "react";
import { Box, Stack, TableCell, TableRow, Typography } from "@mui/material";
import { groupItems, type WorkGroup } from "./statusGrouping";

export function CategoryHeader({ label, count, tableColumns, grid = false }: { label: string; count: number; tableColumns?: number; grid?: boolean }) {
  const content = <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Typography component="h3" variant="subtitle2">{label}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{count}</Typography></Stack>;
  const sx = { px: 1.5, py: 0.75, bgcolor: "action.hover", borderBottom: 1, borderColor: "divider" };
  return tableColumns ? <TableRow><TableCell colSpan={tableColumns} sx={sx}>{content}</TableCell></TableRow> : <Box role={grid ? "row" : undefined} sx={sx}><Box role={grid ? "cell" : undefined}>{content}</Box></Box>;
}

export function StatusGroups<T>({ items, category, children, tableColumns, grid }: { items: readonly T[]; category: (item: T) => WorkGroup; children: (item: T) => ReactNode; tableColumns?: number; grid?: boolean }) {
  return groupItems(items, category).map(group => <Fragment key={group.label}><CategoryHeader label={group.label} count={group.items.length} tableColumns={tableColumns} grid={grid} />{group.items.map(children)}</Fragment>);
}
