#!/usr/bin/env python3
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INQUIRY_TARGET = "/contact-us#confidential-inquiry-form"
SCRIPT = '<script defer src="/assets/csi-inquiry.js?v=20260912"></script>'
SCRIPT_RE = re.compile(r'<script\b[^>]*src=["\']/assets/csi-inquiry\.js(?:\?[^"\']*)?["\'][^>]*></script>', re.I)
ANCHOR_RE = re.compile(
    r'<a\b(?P<attrs>[^>]*\bhref=(?P<quote>["\'])mailto:[^"\']*(?P=quote)[^>]*)>(?P<body>.*?)</a>',
    re.I | re.S,
)
DIRECT_EMAIL = re.compile(r'(\bemail\b|dfw\.csi\.info@gmail\.com)', re.I)


def visible_text(attrs: str, body: str) -> str:
    text = re.sub(r'<[^>]+>', ' ', body)
    for attr in ('aria-label', 'title'):
        match = re.search(rf'\b{attr}=["\']([^"\']+)["\']', attrs, re.I)
        if match:
            text += ' ' + match.group(1)
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def should_route_to_form(match: re.Match[str]) -> bool:
    # Only explicit email choices remain mailto. Every other mailto CTA is treated as
    # an inquiry/service-request action and routed to the real website form.
    return not DIRECT_EMAIL.search(visible_text(match.group('attrs'), match.group('body')))


def rewrite_anchor(match: re.Match[str]) -> str:
    if not should_route_to_form(match):
        return match.group(0)
    attrs = match.group('attrs')
    body = match.group('body')
    attrs = re.sub(
        r'\bhref=(["\'])mailto:[^"\']*\1',
        f'href="{INQUIRY_TARGET}"',
        attrs,
        count=1,
        flags=re.I,
    )
    attrs = re.sub(r'\s+target=(["\'])_top\1', '', attrs, flags=re.I)
    if 'data-csi-inquiry-link=' not in attrs.lower():
        attrs += ' data-csi-inquiry-link="true"'
    return '<a' + attrs + '>' + body + '</a>'


def count_non_email_mailtos(source: str) -> int:
    return sum(1 for match in ANCHOR_RE.finditer(source) if should_route_to_form(match))


def normalize_html(path: Path) -> tuple[bool, int, int]:
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding='utf-8')

    # The homepage form is already working and is deliberately excluded from this migration.
    if rel == 'index.html':
        return False, 0, 0
    if '<meta http-equiv="refresh"' in text and 'Redirecting | CSI:' in text:
        return False, 0, 0

    before = count_non_email_mailtos(text)
    updated = ANCHOR_RE.sub(rewrite_anchor, text)
    after = count_non_email_mailtos(updated)

    updated = SCRIPT_RE.sub(SCRIPT, updated)
    if SCRIPT not in updated:
        updated = updated.replace('</body>', SCRIPT + '\n</body>', 1)

    if updated != text:
        path.write_text(updated, encoding='utf-8')
        return True, before - after, after
    return False, 0, after


def main() -> int:
    changed: list[str] = []
    rewritten = 0
    remaining = 0
    audited = 0

    for path in sorted(ROOT.rglob('*.html')):
        if '.git' in path.parts or '_site' in path.parts:
            continue
        audited += 1
        did_change, fixed, left = normalize_html(path)
        rewritten += fixed
        remaining += left
        if did_change:
            changed.append(path.relative_to(ROOT).as_posix())

    print(f'CSI inquiry CTA audit: {audited} HTML file(s) checked')
    print(f'Non-email mailto CTAs rewritten: {rewritten}')
    print(f'Non-email mailto CTAs remaining outside homepage: {remaining}')
    print(f'Files changed: {len(changed)}')
    for item in changed:
        print(' -', item)

    if remaining:
        raise SystemExit('Inquiry CTA normalization incomplete: non-email mailto links remain.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
