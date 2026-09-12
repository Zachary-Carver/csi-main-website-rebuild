#!/usr/bin/env python3
"""Repair malformed <img> markup produced by the migration normalizer.

The exported GoDaddy HTML frequently uses XHTML-style <img .../> tags. The
normalizer adds performance attributes. This pass guarantees those attributes
remain inside the opening tag and keeps the generated HTML valid.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BROKEN_SLASH = re.compile(
    r'(<img\b[^>]*?)\/\s+(?=(?:decoding|fetchpriority|loading)=)', re.IGNORECASE
)

changed = []
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts or "_site" in path.parts:
        continue
    source = path.read_text(encoding="utf-8")
    fixed = BROKEN_SLASH.sub(r"\1 ", source)
    if fixed != source:
        path.write_text(fixed, encoding="utf-8")
        changed.append(path.relative_to(ROOT).as_posix())

print(f"CSI image markup repair: {len(changed)} file(s) changed")
for item in changed:
    print(" -", item)
