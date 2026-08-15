// scripts/import/xlsx-reader.ts
//
// Dependency-free .xlsx reader. xlsx is a zip of XML; unzip it first
// (`unzip file.xlsx -d outdir`) and point this at the resulting `xl/` tree.
//
// This exists because an earlier hand-rolled regex assumed a cell's `t="s"`
// attribute always came immediately after `r="A1"`, and that a cell always
// has a closing `</c>`. Neither holds: styled cells put `s="n"` before `t`,
// and an empty cell is self-closing (`<c r="W2" s="2"/>`). The old regex ran
// straight through an empty cell into the next one and reported the
// neighbour's shared-string INDEX as if it were the value — that bug is
// where the (nonexistent) "99 Spokes internal hanger code 119" came from.
// See 99spokes-key.ts for the full story.
//
// This reader instead matches each `<c>` element generically (self-closing
// or not) and reads its `r`/`t` attributes in any order.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" doesn't double-decode
}

function loadSharedStrings(xlDir: string): string[] {
  const p = join(xlDir, 'sharedStrings.xml');
  let xml: string;
  try {
    xml = readFileSync(p, 'utf8');
  } catch {
    return [];
  }
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeEntities([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  );
}

export function colToIdx(col: string): number {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export interface SheetRow {
  rowNum: number;
  /** Column letter -> resolved cell value. Missing key means empty cell. */
  cells: Record<string, string | number | boolean | null>;
}

/**
 * Read a worksheet. `xlDir` is the `xl/` directory of an already-unzipped
 * xlsx (e.g. `unzip book.xlsx -d out` then pass `out/xl`).
 */
export function readSheet(xlDir: string, sheetFile = 'worksheets/sheet1.xml'): SheetRow[] {
  const S = loadSharedStrings(xlDir);
  const xml = readFileSync(join(xlDir, sheetFile), 'utf8');
  const rows = [...xml.matchAll(/<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

  return rows.map(([, rowNum, body]) => {
    // Matches both `<c ...>...</c>` and self-closing `<c .../>`, with
    // attributes in any order.
    const cellMatches = [...body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)];
    const cells: SheetRow['cells'] = {};
    for (const [, attrs, inner] of cellMatches) {
      const ref = (attrs.match(/\br="([A-Z]+)\d+"/) || [])[1];
      if (!ref) continue;
      if (inner === undefined) { cells[ref] = null; continue; } // self-closing = empty
      const t = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      const isMatch = inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
      let val: string | number | boolean | null = null;
      if (isMatch) val = decodeEntities(isMatch[1]);
      else if (vMatch) {
        const raw = vMatch[1];
        if (t === 's') val = S[parseInt(raw, 10)] ?? null;
        else if (t === 'b') val = raw === '1';
        else if (t === 'str' || t === 'inlineStr') val = decodeEntities(raw);
        else val = raw === '' ? null : Number(raw);
      }
      cells[ref] = val;
    }
    return { rowNum: Number(rowNum), cells };
  });
}

/** Header row -> { columnLetter: headerName }, skipping blank headers. */
export function readHeaders(rows: SheetRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [col, v] of Object.entries(rows[0]?.cells ?? {})) {
    if (v != null && v !== '') out[col] = String(v);
  }
  return out;
}

/** Convenience: row cells keyed by header NAME instead of column letter. */
export function namedRows(rows: SheetRow[]): Record<string, string | number | boolean | null>[] {
  const headers = readHeaders(rows);
  return rows.slice(1).map((r) => {
    const named: Record<string, string | number | boolean | null> = {};
    for (const [col, name] of Object.entries(headers)) named[name] = r.cells[col] ?? null;
    return named;
  });
}
