#!/usr/bin/env python3
"""Normalize the migrated CSI static site for SEO/AEO, accessibility, and crawlability.

This script is intentionally dependency-free so it can run in GitHub Actions and locally.
It edits the static HTML/XML files in place when called with --write.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from pathlib import Path
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://cleansceneinvestigators.com"
PHONE_DISPLAY = "940-654-6334"
PHONE_E164 = "+1-940-654-6334"
ORG_ID = SITE + "/#organization"
WEBSITE_ID = SITE + "/#website"

SOCIALS = [
    "https://www.facebook.com/profile.php?id=61584871045585",
    "https://www.instagram.com/csi_cleansceneinvestigators/",
    "https://www.linkedin.com/company/csi-clean-scene-investigators/",
    "https://www.tiktok.com/@csichristina",
    "https://www.youtube.com/channel/UC_fr0J-YxxFgyY_2HOZJ7ng",
    "https://www.yelp.com/biz/csi-clean-scene-investigators-ponder",
]

HOME_TITLE = "Crime Scene & Biohazard Cleanup DFW & North Texas | CSI"
HOME_DESCRIPTION = (
    "24/7 crime scene, trauma, biohazard, blood, unattended death, decomposition, "
    "hoarding, odor and vehicle cleanup across DFW and North Texas. Call CSI at "
    + PHONE_DISPLAY
    + "."
)
HOME_H1_OLD = "24/7 Crime Scene &amp; Biohazard Cleanup Across Texas"
HOME_H1_NEW = "24/7 Crime Scene &amp; Biohazard Cleanup in DFW &amp; North Texas"

BLOG_TITLE_MAP = {
    "247-crime-scene-biohazard-cleanup-in-dfw-%7C-csi-clean-scene-in":
        "24/7 Crime Scene & Biohazard Cleanup in DFW | CSI: Clean Scene Investigators",
    "247-crime-scene-biohazard-cleanup-in-dfw-|-csi-clean-scene-in":
        "24/7 Crime Scene & Biohazard Cleanup in DFW | CSI: Clean Scene Investigators",
    "unattended-death-cleanup-denton-tx-%7C-csi-clean-scene-investigator":
        "Unattended Death Cleanup Denton TX | CSI: Clean Scene Investigators",
    "unattended-death-cleanup-denton-tx-|-csi-clean-scene-investigator":
        "Unattended Death Cleanup Denton TX | CSI: Clean Scene Investigators",
    "who-cleans-up-after-a-crime-scene-in-texas-%7C-csi":
        "Who Cleans Up After a Crime Scene in Texas? | CSI: Clean Scene Investigators",
    "who-cleans-up-after-a-crime-scene-in-texas-|-csi":
        "Who Cleans Up After a Crime Scene in Texas? | CSI: Clean Scene Investigators",
    "when-clean-means-more-the-reality-behind-trauma-biohazard-clea":
        "When Clean Means More: The Reality Behind Trauma & Biohazard Cleanup",
    "why-not-all-cleaning-is-safe-what-you-need-to-know-before-you-to":
        "Why Not All Cleaning Is Safe: What to Know Before DIY Biohazard Cleanup",
    "spring-cleaning-isn’t-enough-here’s-what-your-home-actually-need":
        "Spring Cleaning Isn’t Enough: Here’s What Your Home Actually Needs",
}

SPECIAL_TITLES = {
    "index.html": HOME_TITLE,
    "contact-us/index.html": "Contact CSI | 24/7 Crime Scene & Biohazard Cleanup DFW",
    "service-areas-in-texas/index.html": "Crime Scene & Biohazard Cleanup Service Areas | CSI",
}

SPECIAL_DESCRIPTIONS = {
    "index.html": HOME_DESCRIPTION,
    "contact-us/index.html": (
        "Contact CSI: Clean Scene Investigators for 24/7 crime scene, trauma and biohazard cleanup "
        "across DFW and North Texas. Call " + PHONE_DISPLAY + "."
    ),
}

SERVICE_PATHS = {
    "crime-scene-cleaning-dfw": "Crime scene cleanup and trauma remediation",
    "suicide-cleanup-dfw": "Suicide cleanup and trauma remediation",
    "homicide-cleanup-dfw": "Homicide and crime scene cleanup",
    "biohazard-cleanup-in-dfw": "Biohazard and trauma cleanup",
    "blood-cleanup-dallas-tx": "Blood cleanup and biohazard remediation",
    "unattended-death-cleanup": "Unattended death cleanup",
    "decomposition-cleanup-dfw": "Decomposition cleanup and odor remediation",
    "hoarding-cleanup-in-texas": "Hoarding remediation",
    "advanced-odor-removal-dfw": "Forensic odor removal",
    "vehicle-biohazard-dfw-tx": "Vehicle biohazard cleanup",
}

CITY_SUFFIX = "-tx-response"
REDIRECT_STUBS = {
    "home/index.html": "/",
    "ols/products/index.html": "/",
}

REDIRECT_RULES = [
    "/home / 301",
    "/ols/products / 301",
    "/f/* /follow-us/f/:splat 301",
    "/grapevine-tx-response /service-areas-in-texas 301",
    "/safety-compliance /safety-and-compliance 301",
    "/farmers-branch-tx-response /farmers-branch-response 301",
]

NESTED_NUMERIC = re.compile(r"&(?:amp;)+#(x[0-9a-f]+|\d+);", re.I)
CSI_SCHEMA_BLOCK = re.compile(
    r"\n?<!-- CSI SEO SCHEMA START -->.*?<!-- CSI SEO SCHEMA END -->\n?", re.S
)
CSI_PERF_BLOCK = re.compile(
    r"\n?<!-- CSI PERFORMANCE START -->.*?<!-- CSI PERFORMANCE END -->\n?", re.S
)


def esc_text(value: str) -> str:
    return html.escape(value, quote=False)


def esc_attr(value: str) -> str:
    return html.escape(value, quote=True)


def decode_nested_numeric_entities(source: str) -> str:
    def repl(match: re.Match[str]) -> str:
        token = match.group(1)
        try:
            code = int(token[1:], 16) if token.lower().startswith("x") else int(token)
            char = chr(code)
        except (ValueError, OverflowError):
            return match.group(0)
        # Keep reserved HTML characters safely encoded in source.
        return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}.get(char, char)

    previous = None
    current = source
    while previous != current and NESTED_NUMERIC.search(current):
        previous = current
        current = NESTED_NUMERIC.sub(repl, current)
    return current


def extract_title(source: str) -> str:
    match = re.search(r"<title>(.*?)</title>", source, flags=re.I | re.S)
    return html.unescape(re.sub(r"<[^>]+>", "", match.group(1))).strip() if match else ""


def extract_meta(source: str, attr: str, key: str) -> str:
    pattern = re.compile(
        rf"<meta\b(?=[^>]*\b{re.escape(attr)}=[\"']{re.escape(key)}[\"'])[^>]*\bcontent=[\"']([^\"']*)[\"'][^>]*>",
        re.I,
    )
    match = pattern.search(source)
    return html.unescape(match.group(1)).strip() if match else ""


def extract_canonical(source: str) -> str:
    match = re.search(
        r"<link\b(?=[^>]*\brel=[\"']canonical[\"'])[^>]*\bhref=[\"']([^\"']+)[\"'][^>]*>",
        source,
        flags=re.I,
    )
    return html.unescape(match.group(1)).strip() if match else ""


def set_title(source: str, value: str) -> str:
    replacement = f"<title>{esc_text(value)}</title>"
    if re.search(r"<title>.*?</title>", source, flags=re.I | re.S):
        return re.sub(r"<title>.*?</title>", replacement, source, count=1, flags=re.I | re.S)
    return source.replace("</head>", replacement + "</head>", 1)


def set_meta(source: str, attr: str, key: str, value: str) -> str:
    tag_pattern = re.compile(
        rf"<meta\b(?=[^>]*\b{re.escape(attr)}=[\"']{re.escape(key)}[\"'])[^>]*>", re.I
    )
    new_tag = f'<meta {attr}="{esc_attr(key)}" content="{esc_attr(value)}"/>'
    if tag_pattern.search(source):
        return tag_pattern.sub(new_tag, source, count=1)
    return source.replace("</head>", new_tag + "\n</head>", 1)


def set_canonical(source: str, value: str) -> str:
    pattern = re.compile(
        r"<link\b(?=[^>]*\brel=[\"']canonical[\"'])[^>]*>", re.I
    )
    tag = f'<link rel="canonical" href="{esc_attr(value)}"/>'
    if pattern.search(source):
        return pattern.sub(tag, source, count=1)
    return source.replace("</head>", tag + "\n</head>", 1)


def absolute_asset_url(value: str) -> str:
    if not value:
        return value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    cleaned = re.sub(r"^(?:\.\./)+", "", value).lstrip("./")
    if not cleaned.startswith("/"):
        cleaned = "/" + cleaned
    return SITE + cleaned


def route_from_rel(rel: str) -> str:
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("/index.html")]
    return "/" + rel


def humanize_segment(segment: str) -> str:
    segment = segment.replace("%7C", "|")
    segment = segment.replace("%26", "&")
    segment = segment.replace("-tx-response", "")
    segment = segment.replace("-", " ")
    return segment.strip().title()


def city_name_from_slug(slug: str) -> str:
    return humanize_segment(slug)


def jsonld_for_page(rel: str, source: str, title: str, description: str, canonical: str) -> dict:
    graph: list[dict] = []
    if rel == "index.html":
        graph.extend(
            [
                {
                    "@type": "Organization",
                    "@id": ORG_ID,
                    "name": "CSI: Clean Scene Investigators",
                    "url": SITE + "/",
                    "telephone": PHONE_E164,
                    "description": (
                        "Former Crime Scene Investigator-founded specialty cleanup company providing "
                        "crime scene, trauma and biohazard remediation across DFW and North Texas."
                    ),
                    "foundingDate": "2026",
                    "founder": {
                        "@type": "Person",
                        "name": "Christina Hester",
                        "jobTitle": "Founder and CEO",
                    },
                    "areaServed": [
                        {"@type": "Place", "name": "Dallas-Fort Worth Metroplex, Texas"},
                        {"@type": "Place", "name": "North Texas"},
                    ],
                    "sameAs": SOCIALS,
                },
                {
                    "@type": "WebSite",
                    "@id": WEBSITE_ID,
                    "url": SITE + "/",
                    "name": "CSI: Clean Scene Investigators",
                    "publisher": {"@id": ORG_ID},
                },
            ]
        )
    else:
        route = route_from_rel(rel)
        parts = [p for p in route.split("/") if p]
        items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"}]
        if rel.startswith("follow-us/f/"):
            items.append(
                {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + "/follow-us"}
            )
            items.append(
                {"@type": "ListItem", "position": 3, "name": title, "item": canonical}
            )
        else:
            for index, segment in enumerate(parts, start=2):
                name = title if index == len(parts) + 1 else humanize_segment(segment)
                item = SITE + "/" + "/".join(parts[: index - 1])
                items.append({"@type": "ListItem", "position": index, "name": name, "item": item})
        graph.append({"@type": "BreadcrumbList", "itemListElement": items})

        slug = Path(rel).parent.name
        if slug.endswith(CITY_SUFFIX):
            graph.append(
                {
                    "@type": "Service",
                    "@id": canonical + "#service",
                    "name": title,
                    "serviceType": "Crime scene, trauma and biohazard cleanup",
                    "description": description,
                    "url": canonical,
                    "areaServed": {"@type": "City", "name": city_name_from_slug(slug) + ", Texas"},
                    "provider": {"@id": ORG_ID},
                }
            )
        elif slug in SERVICE_PATHS and '"@type": "Service"' not in source:
            graph.append(
                {
                    "@type": "Service",
                    "@id": canonical + "#service",
                    "name": title,
                    "serviceType": SERVICE_PATHS[slug],
                    "description": description,
                    "url": canonical,
                    "areaServed": [
                        {"@type": "Place", "name": "Dallas-Fort Worth Metroplex, Texas"},
                        {"@type": "Place", "name": "North Texas"},
                    ],
                    "provider": {"@id": ORG_ID},
                }
            )
        elif rel.startswith("follow-us/f/"):
            image = absolute_asset_url(extract_meta(source, "property", "og:image"))
            article = {
                "@type": "Article",
                "@id": canonical + "#article",
                "headline": title,
                "description": description,
                "mainEntityOfPage": canonical,
                "author": {"@id": ORG_ID},
                "publisher": {"@id": ORG_ID},
            }
            if image:
                article["image"] = image
            graph.append(article)

    return {"@context": "https://schema.org", "@graph": graph}


def inject_schema(source: str, rel: str, title: str, description: str, canonical: str) -> str:
    # Existing pages now contain one authoritative graph. Preserve it idempotently.
    if 'type="application/ld+json"' in source or "type='application/ld+json'" in source:
        return source
    payload = json.dumps(jsonld_for_page(rel, source, title, description, canonical), separators=(",", ":"), ensure_ascii=False)
    block = SCHEMA_MARKER + "\n" + '<script type="application/ld+json">' + payload + "</script>\n"
    return source.replace("</head>", block + "</head>", 1)

def inject_performance_css(source: str) -> str:
    source = CSI_PERF_BLOCK.sub("", source)
    block = """
<!-- CSI PERFORMANCE START -->
<style>
  @media (prefers-reduced-motion: reduce) {
    [data-aid="HEADER_VIDEO"] { display: none !important; }
    *, *::before, *::after { scroll-behavior: auto !important; }
  }
</style>
<!-- CSI PERFORMANCE END -->
"""
    return source.replace("</head>", block + "</head>", 1)


def improve_images(source: str) -> str:
    img_re = re.compile(r"<img\b[^>]*>", re.I)

    def repl(match: re.Match[str]) -> str:
        tag = match.group(0)
        is_hero = 'data-ux="HeaderMediaImage"' in tag or "data-ux='HeaderMediaImage'" in tag
        if re.search(r"\bdecoding=", tag, flags=re.I) is None:
            tag = tag[:-1] + ' decoding="async">'
        if is_hero:
            if re.search(r"\bfetchpriority=", tag, flags=re.I) is None:
                tag = tag[:-1] + ' fetchpriority="high">'
            tag = re.sub(
                r'alt=["\'](?:\.\./)*assets/(?:media|local)/[^"\']+["\']',
                'alt="CSI: Clean Scene Investigators crime scene and biohazard cleanup"',
                tag,
                count=1,
                flags=re.I,
            )
        elif re.search(r"\bloading=", tag, flags=re.I) is None:
            tag = tag[:-1] + ' loading="lazy">'
        return tag

    return img_re.sub(repl, source)


def remove_hidden_scalers(source: str) -> str:
    return re.sub(
        r'<span\b(?=[^>]*\bdata-ux=["\']scaler["\'])[^>]*>.*?</span>',
        "",
        source,
        flags=re.I | re.S,
    )


def fix_archive_titles(source: str) -> str:
    for slug, title in BLOG_TITLE_MAP.items():
        href = "/follow-us/f/" + slug
        pattern = re.compile(
            rf'(<a\b[^>]*\bhref=["\']{re.escape(href)}["\'][^>]*>)(.*?)(</a>)',
            re.I | re.S,
        )
        source = pattern.sub(
            lambda m: m.group(1) + esc_text(title) + m.group(3), source
        )
    return source


def redirect_stub(target: str) -> str:
    absolute = SITE + target
    return f'''<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="{esc_attr(absolute)}">
  <meta http-equiv="refresh" content="0; url={esc_attr(target)}">
  <title>Redirecting | CSI: Clean Scene Investigators</title>
</head>
<body>
  <p>This page has moved. <a href="{esc_attr(target)}">Continue to CSI: Clean Scene Investigators</a>.</p>
  <script>location.replace({json.dumps(target)});</script>
</body>
</html>
'''


def normalize_html(path: Path) -> tuple[str, bool]:
    rel = path.relative_to(ROOT).as_posix()
    original = path.read_text(encoding="utf-8")
    if rel in REDIRECT_STUBS:
        updated = redirect_stub(REDIRECT_STUBS[rel])
        return updated, updated != original

    source = decode_nested_numeric_entities(original)
    source = source.replace('href="/home"', 'href="/"').replace("href='/home'", "href='/'")
    source = remove_hidden_scalers(source)

    old_title = extract_title(source)
    new_title = SPECIAL_TITLES.get(rel, old_title)
    if rel.startswith("follow-us/f/"):
        new_title = BLOG_TITLE_MAP.get(path.parent.name, new_title)
    if new_title:
        source = set_title(source, new_title)

    description = SPECIAL_DESCRIPTIONS.get(rel) or extract_meta(source, "name", "description")
    canonical = extract_canonical(source)
    if rel == "index.html":
        canonical = SITE + "/"
        source = set_canonical(source, canonical)
        source = source.replace(HOME_H1_OLD, HOME_H1_NEW)
        source = source.replace(
            "24/7 Crime Scene & Biohazard Cleanup Across Texas",
            "24/7 Crime Scene & Biohazard Cleanup in DFW & North Texas",
        )
    elif not canonical:
        canonical = SITE + route_from_rel(rel)
        source = set_canonical(source, canonical)

    if description:
        source = set_meta(source, "name", "description", description)

    if new_title and old_title and new_title != old_title and rel.startswith("follow-us/f/"):
        source = source.replace(esc_text(old_title), esc_text(new_title))
        source = source.replace(old_title, esc_text(new_title))

    # Keep every social preview aligned with the actual page metadata.
    if new_title:
        source = set_meta(source, "property", "og:title", new_title)
        source = set_meta(source, "name", "twitter:title", new_title)
        source = set_meta(source, "name", "twitter:image:alt", new_title)
    if description:
        source = set_meta(source, "property", "og:description", description)
        source = set_meta(source, "name", "twitter:description", description)
    if canonical:
        source = set_meta(source, "property", "og:url", canonical)

    og_image = extract_meta(source, "property", "og:image")
    tw_image = extract_meta(source, "name", "twitter:image") or og_image
    if og_image:
        source = set_meta(source, "property", "og:image", absolute_asset_url(og_image))
    if tw_image:
        source = set_meta(source, "name", "twitter:image", absolute_asset_url(tw_image))
        source = set_meta(source, "name", "twitter:card", "summary_large_image")

    if rel == "follow-us/index.html":
        source = fix_archive_titles(source)

    source = improve_images(source)
    source = inject_performance_css(source)

    title_for_schema = new_title or extract_title(source) or "CSI: Clean Scene Investigators"
    description_for_schema = description or "Crime scene, trauma and biohazard cleanup in DFW and North Texas."
    canonical_for_schema = canonical or SITE + route_from_rel(rel)
    source = inject_schema(
        source, rel, title_for_schema, description_for_schema, canonical_for_schema
    )

    return source, source != original


def update_redirects(write: bool) -> bool:
    path = ROOT / "_redirects"
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    existing_rules = [line.strip() for line in existing.splitlines() if line.strip() and not line.lstrip().startswith("#")]
    merged: list[str] = []
    for rule in REDIRECT_RULES + existing_rules:
        if rule not in merged:
            merged.append(rule)
    updated = "# CSI canonical and legacy redirects\n" + "\n".join(merged) + "\n"
    if updated != existing and write:
        path.write_text(updated, encoding="utf-8")
    return updated != existing


def canonical_entries() -> tuple[list[str], list[str]]:
    website: set[str] = set()
    blog: set[str] = set()
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT).as_posix()
        if rel == "404.html" or rel in REDIRECT_STUBS or "/.git/" in rel:
            continue
        source = path.read_text(encoding="utf-8")
        if re.search(r'<meta\b[^>]*name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', source, re.I):
            continue
        canonical = extract_canonical(source)
        if not canonical or not canonical.startswith(SITE):
            continue
        if rel.startswith("follow-us/f/"):
            blog.add(canonical)
        else:
            website.add(canonical)
    return sorted(website), sorted(blog)


def sitemap_xml(urls: list[str], today: str, root_priority: bool = False) -> str:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        priority = "1.0" if root_priority and url.rstrip("/") == SITE else "0.6"
        lines.extend(
            [
                "  <url>",
                f"    <loc>{html.escape(url)}</loc>",
                f"    <lastmod>{today}</lastmod>",
                "    <changefreq>weekly</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def update_sitemaps(write: bool) -> list[str]:
    website, blog = canonical_entries()
    today = dt.date.today().isoformat()
    generated = {
        "sitemap.website.xml": sitemap_xml(website, today, root_priority=True),
        "sitemap.blog.xml": sitemap_xml(blog, today),
        "sitemap.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"  <sitemap><loc>{SITE}/sitemap.website.xml</loc></sitemap>\n"
            f"  <sitemap><loc>{SITE}/sitemap.blog.xml</loc></sitemap>\n"
            "</sitemapindex>\n"
        ),
    }
    changed: list[str] = []
    for name, content in generated.items():
        path = ROOT / name
        current = path.read_text(encoding="utf-8") if path.exists() else ""
        if current != content:
            changed.append(name)
            if write:
                path.write_text(content, encoding="utf-8")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write repairs in place")
    args = parser.parse_args()

    changed: list[str] = []
    html_files = sorted(
        p for p in ROOT.rglob("*.html") if ".git" not in p.parts and "_site" not in p.parts
    )
    for path in html_files:
        updated, did_change = normalize_html(path)
        if did_change:
            rel = path.relative_to(ROOT).as_posix()
            changed.append(rel)
            if args.write:
                path.write_text(updated, encoding="utf-8")

    if update_redirects(args.write):
        changed.append("_redirects")

    # Sitemaps must be generated after HTML canonicals are normalized.
    if args.write:
        changed.extend(update_sitemaps(True))
    else:
        # In audit mode, do not generate against hypothetical in-memory HTML.
        pass

    print(f"CSI site repair: {len(changed)} file(s) changed")
    for item in changed:
        print(" -", item)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
