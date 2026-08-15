#!/usr/bin/env python3
"""
Extract component specs from SRAM's product pages.

SRAM publishes no single specification document the way Shimano does, but
every model page carries a server-rendered spec table:

    <table id="spec-table">
      <tr><th>Speed (CS)</th><td>12</td></tr>
      <tr><th>Driver Body Interface</th><td>XD</td></tr>
      ...

which is in several respects better than the PDF -- the interfaces we care
about are named outright rather than implied by a tick in a matrix.

Model URLs come from SRAM's own sitemap, so this walks a list they publish
rather than guessing at addresses. Requests are rate limited and capped per
category: the aim is a working sample, not a copy of their catalogue.

Output matches extract_shimano.py, so import-parts.ts consumes either:

    { "modelNo": "CS-XG-1275-B1", "series": ..., "fields": { ... } }

Usage:
    python extract_sram.py <out.json> [--per-category 20] [--delay 1.0]
"""

import json
import re
import sys
import time
import urllib.request

SITEMAP = "https://www.sram.com/sitemap.en.xml"
UA = "Mozilla/5.0 (compatible; bike-partpicker/1.0; spec research)"

# Model-number prefixes worth fetching, mapped to nothing in particular here --
# the importer decides what each becomes.
PREFIXES = ("cs", "cn", "rd", "fc", "bb", "rt", "sl")

SPEC_TABLE = re.compile(r'<table id="spec-table"[^>]*>(.*?)</table>', re.S | re.I)
# Row tags require no attributes on `<tr>` originally; a styled row
# (`<tr class="row-even">`, a common CMS/templating pattern) matched
# nothing and dropped that entire page's data with zero error --
# confirmed live: feeding a page using `<tr class="...">` returned no
# fields at all, silently. `[^>]*` on both tags tolerates whatever
# attributes SRAM's markup carries without weakening what's matched inside.
SPEC_ROW = re.compile(r"<tr[^>]*>\s*<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>\s*</tr>", re.S | re.I)
MODEL_ID = re.compile(r"Model ID\s*</\w+>\s*<[^>]*>\s*([A-Za-z0-9\-\.]+)", re.S | re.I)
MSRP = re.compile(r"MSRP\s*</\w+>\s*<[^>]*>\s*([^<]+)", re.S | re.I)
TITLE = re.compile(r"<title>(.*?)</title>", re.S | re.I)


def strip_tags(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def model_urls():
    xml = fetch(SITEMAP)
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    out = {p: [] for p in PREFIXES}
    # The sitemap lists the same model twice -- once under /sram/models/,
    # once under /service/models/ -- so URLs are deduplicated by the model
    # slug itself, not by the URL string, or every page gets fetched (and
    # imported) twice.
    seen_slugs = set()
    for u in urls:
        m = re.search(r"/models/([a-z0-9\-\.]+)$", u)
        if not m:
            continue
        slug = m.group(1)
        prefix = slug.split("-")[0]
        if prefix not in out or slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        out[prefix].append(u)
    return out


def parse_page(html, url):
    table = SPEC_TABLE.search(html)
    if not table:
        return None
    fields = {}
    for th, td in SPEC_ROW.findall(table.group(1)):
        label, value = strip_tags(th), strip_tags(td)
        if label and value:
            fields[label] = value
    if not fields:
        return None

    model_id = MODEL_ID.search(html)
    if not model_id:
        # Fall back to the slug, which is the model id lowercased.
        model_id = re.search(r"/models/([a-z0-9\-\.]+)", url)
        model_no = model_id.group(1).upper() if model_id else None
    else:
        model_no = model_id.group(1).upper()
    if not model_no:
        return None

    title = TITLE.search(html)
    name = strip_tags(title.group(1)).split("|")[0].strip() if title else None

    msrp = MSRP.search(html)
    if msrp:
        # Kept as printed, currency symbol and all. The importer decides
        # whether it is a currency it can store; converting would invent a
        # figure SRAM never published.
        fields["MSRP"] = strip_tags(msrp.group(1))

    return {
        "modelNo": model_no,
        "series": name,
        "sourcePage": 0,
        "sourceUrl": url,
        "fields": fields,
    }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out_path = sys.argv[1]
    per_cat = 20
    delay = 1.0
    if "--per-category" in sys.argv:
        per_cat = int(sys.argv[sys.argv.index("--per-category") + 1])
    if "--delay" in sys.argv:
        delay = float(sys.argv[sys.argv.index("--delay") + 1])

    buckets = model_urls()
    print("sitemap models found: " + ", ".join(f"{k}={len(v)}" for k, v in buckets.items()))

    models, failed = [], 0
    for prefix, urls in buckets.items():
        taken = 0
        for url in urls:
            if taken >= per_cat:
                break
            try:
                page = parse_page(fetch(url), url)
            except Exception as exc:
                failed += 1
                page = None
            if page:
                models.append(page)
                taken += 1
            time.sleep(delay)          # be a good guest on someone else's server
        print(f"  {prefix}: {taken} with spec tables")

    payload = {
        "source": "SRAM product specification pages",
        "sourceUrl": "https://www.sram.com/",
        "dataSource": "MANUFACTURER_SPEC",
        "models": models,
    }
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    print(f"\nmodels written : {len(models)}")
    print(f"fetch failures : {failed}")
    print(f"written to     : {out_path}")


if __name__ == "__main__":
    main()
