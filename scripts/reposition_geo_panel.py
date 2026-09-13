#!/usr/bin/env python3
"""Keep the homepage geographic SEO panel directly above site navigation."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / "index.html"

GEO_BLOCK = re.compile(
    r"\n?<!-- CSI GEO SEO START -->.*?<!-- CSI GEO SEO END -->\n?",
    re.S,
)
SITEMAP_DIVIDER = re.compile(
    r'<div\s+class=["\']csi-sitemap-divider["\']',
    re.I,
)


def main() -> None:
    source = HOME.read_text(encoding="utf-8")
    match = GEO_BLOCK.search(source)
    if not match:
        raise SystemExit("Homepage geographic SEO panel not found.")

    block = match.group(0).strip("\n")
    source_without_block = GEO_BLOCK.sub("\n", source, count=1)

    divider = SITEMAP_DIVIDER.search(source_without_block)
    if not divider:
        raise SystemExit("Homepage site-navigation divider not found.")

    updated = (
        source_without_block[: divider.start()]
        + "\n"
        + block
        + "\n\n  "
        + source_without_block[divider.start() :]
    )

    if updated != source:
        HOME.write_text(updated, encoding="utf-8")
        print("Moved homepage geographic SEO panel above site navigation.")
    else:
        print("Homepage geographic SEO panel already in the requested position.")


if __name__ == "__main__":
    main()
