import type { ScheduleCell } from "./schedulePreview";

export function scheduleCsv(table: ScheduleCell[][]) {
  return "\uFEFF" + table.map(row => row.map(value => {
    let text = String(value);
    // CSV consumers may interpret user-entered text as a spreadsheet formula.
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}

const xml = (value: string) => Array.from(value).filter(character => {
  const code = character.codePointAt(0)!;
  return code === 9 || code === 10 || code === 13 || code >= 32 && code <= 0xd7ff || code >= 0xe000 && code <= 0xfffd || code >= 0x10000 && code <= 0x10ffff;
}).join("").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const column = (index: number): string => index >= 26 ? column(Math.floor(index / 26) - 1) + column(index % 26) : String.fromCharCode(65 + index);
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Store the small workbook as a standards-based ZIP, without a runtime dependency. */
function zip(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path), data = encoder.encode(text);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(12, 0x21, true);
    l.setUint32(14, crc, true); l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, name.length, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.set(name, 46); parts.push(local, data); directory.push(central); offset += local.length + data.length;
  }
  const size = directory.reduce((sum, bytes) => sum + bytes.length, 0);
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, directory.length, true); e.setUint16(10, directory.length, true); e.setUint32(12, size, true); e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + size + end.length);
  let cursor = 0;
  for (const part of [...parts, ...directory, end]) { result.set(part, cursor); cursor += part.length; }
  return result;
}

export function scheduleExcel(table: ScheduleCell[][]) {
  const last = `${column(table[0].length - 1)}${table.length}`;
  const rows = table.map((row, i) => {
    const lines = Math.max(...row.map(value => String(value).split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 36)), 0)));
    const height = i === 0 ? 30 : Math.max(45, lines * 15 + 10);
    return `<row r="${i + 1}" ht="${height}" customHeight="1">${row.map((value, j) => {
    const ref = `${column(j)}${i + 1}`;
    return typeof value === "number" ? `<c r="${ref}" s="2"><v>${value}</v></c>` : `<c r="${ref}" t="inlineStr" s="${i === 0 ? 1 : 0}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    }).join("")}</row>`;
  }).join("");
  return zip({
    "[Content_Types].xml": declaration + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels": declaration + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": declaration + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Schedule" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": declaration + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": declaration + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5B4BE1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    "xl/worksheets/sheet1.xml": declaration + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="45"/><cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="16" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="${table[0].length - 1}" width="38" customWidth="1"/><col min="${table[0].length}" max="${table[0].length}" width="18" customWidth="1"/></cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`,
  });
}

export function downloadSchedule(table: ScheduleCell[][], from: string, to: string, format: "csv" | "xlsx") {
  const blob = format === "csv" ? new Blob([scheduleCsv(table)], { type: "text/csv;charset=utf-8" }) : new Blob([scheduleExcel(table)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `schedule-${from}-to-${to}.${format}`;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
