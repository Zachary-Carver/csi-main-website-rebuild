#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = "https://christina-portfolio-site.vercel.app"
NEW = "https://christina.cleansceneinvestigators.com"
EXTENSIONS = {".html", ".js", ".css", ".json", ".xml", ".txt", ".md"}
SKIP_DIRS = {".git", "_site", "node_modules", "output", "outputs"}

# These two malformed fragments were introduced in the old static export around
# Christina portfolio CTAs. Repair them while normalizing the destination.
MALFORMED_REPLACEMENTS = {
    'rel="noopener noreferrer"s professional portfolio"': 'rel="noopener noreferrer" aria-label="Explore Christina Hester professional portfolio"',
    '}"s professional work"': '}" aria-label="Explore Christina Hester professional work"',
}


def main() -> int:
    changed = []
    replacements = 0
    malformed_fixed = 0

    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        updated = text
        count = updated.count(OLD)
        if count:
            updated = updated.replace(OLD, NEW)
            replacements += count

        for bad, good in MALFORMED_REPLACEMENTS.items():
            count_bad = updated.count(bad)
            if count_bad:
                updated = updated.replace(bad, good)
                malformed_fixed += count_bad

        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed.append(path.relative_to(ROOT).as_posix())

    print(f"Christina portfolio URL replacements: {replacements}")
    print(f"Malformed portfolio CTA fragments repaired: {malformed_fixed}")
    print(f"Files changed: {len(changed)}")
    for item in changed:
        print(" -", item)

    remaining = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        try:
            if OLD in path.read_text(encoding="utf-8"):
                remaining.append(path.relative_to(ROOT).as_posix())
        except UnicodeDecodeError:
            pass
    if remaining:
        raise SystemExit("Old Vercel portfolio URL still present in: " + ", ".join(remaining))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
