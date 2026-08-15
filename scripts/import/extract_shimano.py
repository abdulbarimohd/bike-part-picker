#!/usr/bin/env python3
"""
Generic table extractor for Shimano's official technical documents.

    https://productinfo.shimano.com/pdfs/product/latest/Specifications_en.pdf
    https://productinfo.shimano.com/pdfs/product/latest/Compatibility_en.pdf

Shimano lays every component category out the same way -- a `Series` row, a
`Model no.` row, then one labelled row per attribute, with 2-4 models side by
side in columns:

    Series        XTR          XTR          DEORE XT
    Model no.     CS-M9200-12  CS-M9101-12  CS-M8200-12
    Rear speeds   12           12           12
    MICRO SPLINE  (tick)       (tick)       (tick)

So this script knows nothing about cassettes, chains or derailleurs. It reads
whatever labelled rows a page happens to carry and emits them verbatim:

    { "modelNo": "CS-M9200-12", "fields": { "Rear speeds": "12", ... } }

Interpreting those labels -- and deciding which are trustworthy enough to
import -- is the importer's job, not this one's. Nothing here infers a value:
a cell the document leaves blank comes out as an empty string.

Extraction is driven by each word's x-coordinate rather than by splitting text
on whitespace. That matters: several values are multi-word ("DEORE XT",
"HG 12-speed"), and whitespace splitting silently shifts every column after
them, producing data that looks right and is wrong.

Usage:
    python extract_shimano.py <pdf> <out.json> [--pages 55,56]
"""

import json
import re
import statistics
import sys

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber missing:  python -m pip install pdfplumber")


ROW_TOLERANCE = 3.0     # points; words within this vertical distance are one row
LABEL_GUTTER = 12.0     # a value may start this far left of its column anchor
COLUMN_SPAN = 0.70      # fraction of column pitch a cell is allowed to occupy
MODEL_ROW = re.compile(r"^Model\s*no\.", re.I)
SERIES_ROW = re.compile(r"^Series\b", re.I)

# Shimano model numbers are a two-or-three letter category code, a hyphen, then
# an alphanumeric designation: CS-M9200-12, RD-M8100-SGS, FC-R9200-P.
# Anything else is a mis-read block rather than a product, and is dropped --
# a wrong model number would attach real specs to a part that does not exist.
VALID_MODEL_NO = re.compile(r"^[A-Z]{2,3}-[A-Z0-9]+(?:-[A-Z0-9]+)*$")


def detect_nav_strip(words, page_width):
    """
    Locate the vertical navigation strip Shimano prints down the right edge.

    Its tab labels share one x-position and repeat all the way down the page,
    which is what distinguishes them from table values. Without this they get
    picked up as an extra column -- the reason CS-6700 read as "10 ST".
    """
    counts = {}
    for w in words:
        if w["x0"] >= page_width * 0.88:
            counts[round(w["x0"])] = counts.get(round(w["x0"]), 0) + 1
    dense = [x for x, c in counts.items() if c >= 8]
    return min(dense) - 2 if dense else page_width


def group_rows(words):
    """Cluster words into visual rows by their vertical position."""
    rows = []
    for word in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if rows and abs(word["top"] - rows[-1][0]["top"]) <= ROW_TOLERANCE:
            rows[-1].append(word)
        else:
            rows.append([word])
    return [sorted(r, key=lambda w: w["x0"]) for r in rows]


def row_text(row):
    return " ".join(w["text"] for w in row)


def despace(value):
    """
    Rejoin values the PDF sets one character at a time.

    Some rows -- weights especially -- are laid out per glyph, so the text
    comes back as "4 6 1 ( 1 0 - 4 5 T )" rather than "461 (10-45T)". When
    nearly every token is a single character that is a typesetting artefact,
    not real spacing, so the spaces are removed. Mixed rows are left alone.
    """
    tokens = value.split()
    if len(tokens) < 4:
        return value
    singles = sum(1 for t in tokens if len(t) == 1)
    if singles / len(tokens) < 0.8:
        return value
    return "".join(tokens)


def find_columns(model_row):
    """
    Derive column anchors from the `Model no.` row.

    Returns (anchors, label_boundary, right_limit) or None when the row does
    not look like a real header -- e.g. a stray mention of "Model no." in prose.
    """
    values = [w for w in model_row if not MODEL_ROW.match(w["text"])]
    # Drop the label words themselves ("Model", "no.") -- they sit far left.
    values = [w for w in values if w["text"].lower() not in ("model", "no.")]
    if len(values) < 2:
        return None

    anchors = [w["x0"] for w in values]
    pitch = statistics.median(
        [b - a for a, b in zip(anchors, anchors[1:])] or [0]
    )
    if pitch <= 0:
        return None

    label_boundary = anchors[0] - LABEL_GUTTER
    return anchors, label_boundary, pitch


def cell_for(word, anchors, pitch_span):
    """Which column does this word belong to? None if it falls between them."""
    for idx, anchor in enumerate(anchors):
        if anchor - LABEL_GUTTER <= word["x0"] < anchor + pitch_span:
            return idx
    return None


def parse_block(rows, start, end, anchors, label_boundary, pitch, right_limit, page_no):
    """Read one `Model no.` block into {model: {label: value}}."""
    # How far right of its anchor a cell may reach. This must come from the
    # column pitch: deriving it from the page's right edge collapses the span
    # on wide tables and silently drops values that sit a little right of
    # their anchor.
    pitch_span = pitch * COLUMN_SPAN
    n = len(anchors)
    fields = [{} for _ in range(n)]
    order = []
    last_label = None

    for row in rows[start:end]:
        label_words, cells = [], [[] for _ in range(n)]
        for word in row:
            if word["x0"] >= right_limit:
                continue                      # right-edge navigation strip
            if word["x0"] < label_boundary:
                label_words.append(word["text"])
                continue
            idx = cell_for(word, anchors, pitch_span)
            if idx is not None:
                cells[idx].append(word["text"])

        label = despace(" ".join(label_words).strip())
        values = [despace(" ".join(c).strip()) for c in cells]

        if not label:
            # Continuation of the row above (Shimano wraps long values).
            if last_label:
                for i, v in enumerate(values):
                    if v:
                        fields[i][last_label] = (fields[i][last_label] + " " + v).strip()
            continue

        if not any(values):
            continue

        # Some labels repeat inside one block -- a derailleur lists both its
        # top-sprocket and low-sprocket limits as plain "Max.", because the
        # distinguishing word sits on its own line above. Storing them under
        # one key would let the second silently overwrite the first, so
        # repeats are suffixed and both survive for the importer to weigh up.
        key = label
        if key in fields[0]:
            dup = 2
            while f"{label} #{dup}" in fields[0]:
                dup += 1
            key = f"{label} #{dup}"

        for i, v in enumerate(values):
            fields[i][key] = v
        if key not in order:
            order.append(key)
        last_label = key

    models = []
    header = fields[0].get("Model no.") if fields else None
    for i in range(n):
        model_no = fields[i].pop("Model no.", "") or ""
        if not model_no:
            continue
        models.append(
            {
                "modelNo": model_no,
                "series": fields[i].pop("Series", "") or None,
                "sourcePage": page_no,
                "fields": fields[i],
            }
        )
    return models


def extract(pdf_path, only_pages=None):
    out = []
    # A block find_columns() declines to parse (fewer than 2 model columns,
    # or a degenerate zero pitch -- most often a genuine standalone/flagship
    # SKU with no siblings in its table) used to vanish here with nothing
    # to show for it: no count, no sample, unlike the VALID_MODEL_NO
    # rejection path below, which reports both. Tracked the same way now,
    # so a page that loses all its data is visible rather than silent.
    skipped = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            if only_pages and page_no not in only_pages:
                continue
            try:
                words = page.extract_words()
            except Exception:
                continue
            rows = group_rows(words)
            nav_x = detect_nav_strip(words, page.width)

            header_idx = [i for i, r in enumerate(rows) if MODEL_ROW.match(row_text(r))]
            for pos, idx in enumerate(header_idx):
                cols = find_columns(rows[idx])
                if not cols:
                    skipped.append((page_no, row_text(rows[idx])[:70]))
                    continue
                anchors, label_boundary, pitch = cols
                table_right = anchors[-1] + pitch * COLUMN_SPAN
                # Only clip at the navigation strip when it genuinely sits
                # beyond the table; otherwise the detector has locked onto a
                # data column and clipping would truncate real values.
                right_limit = table_right if nav_x < table_right else min(table_right, nav_x)
                # `Series` is printed above `Model no.`, so start one row higher.
                start = idx - 1 if idx and SERIES_ROW.match(row_text(rows[idx - 1])) else idx
                end = header_idx[pos + 1] - 1 if pos + 1 < len(header_idx) else len(rows)
                out.extend(
                    parse_block(rows, start, end, anchors, label_boundary,
                                pitch, right_limit, page_no)
                )
    return out, skipped


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    pdf_path, out_path = sys.argv[1], sys.argv[2]

    only = None
    if "--pages" in sys.argv:
        only = {int(x) for x in sys.argv[sys.argv.index("--pages") + 1].split(",")}

    models, skipped_blocks = extract(pdf_path, only)

    rejected = [m for m in models if not VALID_MODEL_NO.match(m["modelNo"])]
    models = [m for m in models if VALID_MODEL_NO.match(m["modelNo"])]

    # A model can appear on several pages; keep the richest record.
    best = {}
    for m in models:
        prev = best.get(m["modelNo"])
        if prev is None or len(m["fields"]) > len(prev["fields"]):
            best[m["modelNo"]] = m

    payload = {
        "source": "Shimano official technical documents",
        "sourceUrl": "https://productinfo.shimano.com/en/spec",
        "dataSource": "MANUFACTURER_SPEC",
        "models": sorted(best.values(), key=lambda m: m["modelNo"]),
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)

    prefixes = {}
    for m in payload["models"]:
        prefixes[m["modelNo"].split("-")[0]] = prefixes.get(m["modelNo"].split("-")[0], 0) + 1
    print(f"models extracted : {len(payload['models'])}")
    print(f"rejected (bad id): {len(rejected)}")
    if rejected:
        sample = ", ".join(repr(m["modelNo"])[:14] for m in rejected[:6])
        print(f"  e.g. {sample}")
    print(f"skipped (<2 cols): {len(skipped_blocks)}")
    if skipped_blocks:
        sample = "; ".join(f"p.{p} {t!r}" for p, t in skipped_blocks[:6])
        print(f"  e.g. {sample}")
    print("by prefix        : " + ", ".join(f"{k}={v}" for k, v in sorted(prefixes.items())))
    print(f"written to       : {out_path}")


if __name__ == "__main__":
    main()
