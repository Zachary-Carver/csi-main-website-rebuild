#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LINK = '<link rel="stylesheet" href="/assets/csi-cleanup.css?v=20260912">'
LINK_RE = re.compile(r'<link\b[^>]*href=["\']/assets/csi-cleanup\.css(?:\?[^"\']*)?["\'][^>]*>', re.I)

LEGACY_REDIRECTS = [
    '/ola/services/vehicle-biohazard-cleanup /vehicle-biohazard-dfw-tx 301',
]


def normalize_html(path: Path) -> bool:
    text = path.read_text(encoding='utf-8')
    if '<meta http-equiv="refresh"' in text and 'Redirecting | CSI:' in text:
        return False
    updated = LINK_RE.sub(LINK, text)
    if LINK not in updated:
        updated = updated.replace('</head>', LINK + '\n</head>', 1)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        return True
    return False


def normalize_redirects() -> bool:
    path = ROOT / '_redirects'
    text = path.read_text(encoding='utf-8') if path.exists() else '# CSI canonical and legacy redirects\n'
    lines = text.splitlines()
    existing = {line.strip() for line in lines if line.strip()}
    changed = False
    for rule in LEGACY_REDIRECTS:
        if rule not in existing:
            lines.append(rule)
            existing.add(rule)
            changed = True
    updated = '\n'.join(lines).rstrip() + '\n'
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        return True
    return changed


def main() -> int:
    changed = []
    for path in sorted(ROOT.rglob('*.html')):
        if '.git' in path.parts or '_site' in path.parts:
            continue
        if normalize_html(path):
            changed.append(path.relative_to(ROOT).as_posix())
    if normalize_redirects():
        changed.append('_redirects')
    print(f'CSI layout cleanup: {len(changed)} file(s) changed')
    for item in changed:
        print(' -', item)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
