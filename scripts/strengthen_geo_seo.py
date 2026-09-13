#!/usr/bin/env python3
"""Strengthen CSI geographic SEO around Dallas-Fort Worth, DFW, and North Texas.

Idempotent, dependency-free, and safe for the migrated static site. It updates metadata
on core regional/service/city pages and injects one visible regional context block plus
supplemental geographic WebPage schema without changing page layout or URLs.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://cleansceneinvestigators.com"
PHONE = "940-654-6334"
REGION = "Dallas-Fort Worth (DFW) Metroplex"
REGION_SCHEMA = "Dallas-Fort Worth Metroplex, Texas"
SECONDARY_REGION = "North Texas"

SKIP = {"home/index.html", "ols/products/index.html"}
GEO_BLOCK = re.compile(r"\n?<!-- CSI GEO SEO START -->.*?<!-- CSI GEO SEO END -->\n?", re.S)
GEO_SCHEMA = re.compile(r"\n?<!-- CSI GEO SCHEMA START -->.*?<!-- CSI GEO SCHEMA END -->\n?", re.S)

SERVICE_META = {
    "crime-scene-cleaning-dfw": (
        "Crime Scene Cleanup Dallas-Fort Worth | CSI",
        f"24/7 crime scene and trauma cleanup across the {REGION} and {SECONDARY_REGION}. Former CSI-founded, discreet response. Call {PHONE}.",
    ),
    "biohazard-cleanup-in-dfw": (
        "Biohazard Cleanup Dallas-Fort Worth | CSI",
        f"24/7 biohazard and trauma cleanup across the {REGION} and {SECONDARY_REGION}. Discreet specialty remediation. Call {PHONE}.",
    ),
    "blood-cleanup-dallas-tx": (
        "Blood Cleanup Dallas-Fort Worth | CSI",
        f"Professional blood and bodily-fluid cleanup across the {REGION} and {SECONDARY_REGION}. 24/7 discreet response. Call {PHONE}.",
    ),
    "unattended-death-cleanup": (
        "Unattended Death Cleanup Dallas-Fort Worth | CSI",
        f"24/7 unattended death and decomposition cleanup across DFW and {SECONDARY_REGION}. Compassionate, discreet response. Call {PHONE}.",
    ),
    "decomposition-cleanup-dfw": (
        "Decomposition Cleanup Dallas-Fort Worth | CSI",
        f"Decomposition cleanup and forensic odor remediation across the {REGION} and {SECONDARY_REGION}. 24/7 specialty response. Call {PHONE}.",
    ),
    "suicide-cleanup-dfw": (
        "Suicide Cleanup Dallas-Fort Worth | CSI",
        f"Compassionate 24/7 suicide and trauma cleanup across DFW and {SECONDARY_REGION}. Former CSI-founded response. Call {PHONE}.",
    ),
    "homicide-cleanup-dfw": (
        "Homicide Cleanup Dallas-Fort Worth | CSI",
        f"24/7 homicide and crime scene cleanup across the {REGION} and {SECONDARY_REGION}. Discreet, trauma-informed response. Call {PHONE}.",
    ),
    "hoarding-cleanup-in-texas": (
        "Hoarding Cleanup Dallas-Fort Worth & North Texas | CSI",
        f"Hazardous hoarding and extreme-mess cleanup across DFW and {SECONDARY_REGION}, with qualifying statewide Texas response. Call {PHONE}.",
    ),
    "advanced-odor-removal-dfw": (
        "Forensic Odor Removal Dallas-Fort Worth | CSI",
        f"Forensic odor removal for decomposition, biohazards and severe odors across the {REGION} and {SECONDARY_REGION}. Call {PHONE}.",
    ),
    "vehicle-biohazard-dfw-tx": (
        "Vehicle Biohazard Cleanup Dallas-Fort Worth | CSI",
        f"Vehicle blood, bodily-fluid and biohazard cleanup across the {REGION} and {SECONDARY_REGION}. Discreet specialty response. Call {PHONE}.",
    ),
}

TOP_CITIES = [
    ("Dallas", "/dallas-tx-response/"),
    ("Fort Worth", "/fort-worth-tx-response/"),
    ("Denton", "/denton-tx-response/"),
    ("Plano", "/plano-tx-response/"),
    ("Frisco", "/frisco-tx-response/"),
    ("Arlington", "/arlington-tx-response/"),
    ("Irving", "/irving-tx-response/"),
    ("McKinney", "/mckinney-tx-response/"),
]

META_OVERRIDES = {
    "follow-us/f/why-local-woman-owned-businesses-matter-in-north-texas/index.html":
        "Why local woman-owned businesses matter across Dallas-Fort Worth (DFW) and North Texas, including CSI: Clean Scene Investigators.",
    "follow-us/f/why-not-all-cleaning-is-safe-what-you-need-to-know-before-you-to/index.html":
        "Why some crime scene, blood and biohazard cleanup in Dallas-Fort Worth (DFW) and North Texas requires trained specialty remediation.",
}


def esc_attr(value: str) -> str:
    return html.escape(value, quote=True)


def set_title(source: str, value: str) -> str:
    tag = f"<title>{html.escape(value, quote=False)}</title>"
    if re.search(r"<title>.*?</title>", source, re.I | re.S):
        return re.sub(r"<title>.*?</title>", tag, source, count=1, flags=re.I | re.S)
    return source.replace("</head>", tag + "</head>", 1)


def set_meta(source: str, attr: str, key: str, value: str) -> str:
    pattern = re.compile(rf"<meta\b(?=[^>]*\b{re.escape(attr)}=[\"']{re.escape(key)}[\"'])[^>]*>", re.I)
    tag = f'<meta {attr}="{esc_attr(key)}" content="{esc_attr(value)}"/>'
    if pattern.search(source):
        return pattern.sub(tag, source, count=1)
    return source.replace("</head>", tag + "\n</head>", 1)


def canonical(source: str) -> str:
    m = re.search(r"<link\b(?=[^>]*\brel=[\"']canonical[\"'])[^>]*\bhref=[\"']([^\"']+)", source, re.I)
    return html.unescape(m.group(1)) if m else ""


def city_from_rel(rel: str) -> str | None:
    parent = Path(rel).parent.name
    if parent.endswith("-tx-response"):
        slug = parent[:-len("-tx-response")]
    elif parent == "farmers-branch-response":
        slug = "farmers-branch"
    else:
        return None
    return " ".join(word.capitalize() for word in slug.split("-"))


def geo_links_for_region() -> str:
    cities = " · ".join(f'<a href="{url}">{name}</a>' for name, url in TOP_CITIES)
    return (
        '<p><strong>Dallas-Fort Worth Metroplex service area:</strong> CSI provides 24/7 crime scene, trauma and biohazard cleanup '
        f'throughout DFW and {SECONDARY_REGION}, including {cities} and surrounding communities.</p>'
        '<p><a href="/service-areas-in-texas/">Explore DFW &amp; North Texas service areas</a> · '
        '<a href="/crime-scene-cleaning-dfw/">Crime scene cleanup across DFW</a> · '
        '<a href="/biohazard-cleanup-in-dfw/">Biohazard cleanup across DFW</a></p>'
    )


def geo_links_for_city(city: str) -> str:
    return (
        f'<p><strong>{html.escape(city)}, Texas is served within CSI\'s Dallas-Fort Worth (DFW) Metroplex and North Texas response area.</strong> '
        'CSI provides 24/7 crime scene, trauma, blood, unattended death, decomposition and biohazard cleanup after the scene is released.</p>'
        '<p><a href="/service-areas-in-texas/">Dallas-Fort Worth service areas</a> · '
        '<a href="/crime-scene-cleaning-dfw/">DFW crime scene cleanup</a> · '
        '<a href="/unattended-death-cleanup/">DFW unattended death cleanup</a> · '
        '<a href="/biohazard-cleanup-in-dfw/">DFW biohazard cleanup</a></p>'
    )


def inject_geo_block(source: str, inner: str) -> str:
    source = GEO_BLOCK.sub("", source)
    block = '\n<!-- CSI GEO SEO START --><div class="wrap csi-geo-seo" data-csi-geo-seo="true">' + inner + '</div><!-- CSI GEO SEO END -->\n'
    if "</footer>" in source:
        return source.replace("</footer>", block + "</footer>", 1)
    return source.replace("</body>", block + "</body>", 1)


def inject_geo_schema(source: str, page_url: str, city: str | None) -> str:
    source = GEO_SCHEMA.sub("", source)
    coverage = []
    if city:
        coverage.append({"@type": "City", "name": f"{city}, Texas"})
    coverage.extend([
        {"@type": "Place", "name": REGION_SCHEMA},
        {"@type": "Place", "name": SECONDARY_REGION},
    ])
    payload = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": page_url + "#geographic-service-area",
        "url": page_url,
        "spatialCoverage": coverage,
        "about": {"@type": "Organization", "name": "CSI: Clean Scene Investigators", "url": SITE + "/"},
    }
    block = '\n<!-- CSI GEO SCHEMA START --><script type="application/ld+json" data-csi-geo-schema="true">' + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + '</script><!-- CSI GEO SCHEMA END -->\n'
    return source.replace("</head>", block + "</head>", 1)


def apply(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    if rel in SKIP or rel.startswith("_site/") or "/node_modules/" in rel:
        return False

    source = path.read_text(encoding="utf-8")
    original = source
    city = city_from_rel(rel)
    parent = Path(rel).parent.name
    targeted = False

    if rel == "index.html":
        title = "Crime Scene & Biohazard Cleanup Dallas-Fort Worth | CSI"
        desc = f"24/7 crime scene, trauma, biohazard, blood, unattended-death, hoarding, odor and vehicle cleanup across DFW and {SECONDARY_REGION}. Call {PHONE}."
        source = set_title(source, title)
        source = set_meta(source, "name", "description", desc)
        source = set_meta(source, "property", "og:title", title)
        source = set_meta(source, "property", "og:description", desc)
        source = set_meta(source, "name", "twitter:title", title)
        source = set_meta(source, "name", "twitter:description", desc)
        source = source.replace("24/7 Crime Scene &amp; Biohazard Cleanup in DFW &amp; North Texas", "24/7 Crime Scene &amp; Biohazard Cleanup in the Dallas-Fort Worth Metroplex")
        source = source.replace("24/7 Crime Scene & Biohazard Cleanup in DFW & North Texas", "24/7 Crime Scene & Biohazard Cleanup in the Dallas-Fort Worth Metroplex")
        targeted = True
    elif parent in SERVICE_META:
        title, desc = SERVICE_META[parent]
        source = set_title(source, title)
        source = set_meta(source, "name", "description", desc)
        source = set_meta(source, "property", "og:title", title)
        source = set_meta(source, "property", "og:description", desc)
        source = set_meta(source, "name", "twitter:title", title)
        source = set_meta(source, "name", "twitter:description", desc)
        targeted = True
    elif rel == "service-areas-in-texas/index.html":
        title = "Dallas-Fort Worth & North Texas Crime Scene Cleanup Areas | CSI"
        desc = f"Crime scene, trauma and biohazard cleanup across Dallas-Fort Worth (DFW) and {SECONDARY_REGION}, with qualifying statewide Texas response. Call {PHONE}."
        source = set_title(source, title)
        source = set_meta(source, "name", "description", desc)
        source = set_meta(source, "property", "og:title", title)
        source = set_meta(source, "property", "og:description", desc)
        targeted = True
    elif rel == "contact-us/index.html":
        title = "Contact CSI | Dallas-Fort Worth Crime Scene & Biohazard Cleanup"
        desc = f"Contact CSI for 24/7 crime scene, trauma and biohazard cleanup across the {REGION} and {SECONDARY_REGION}. Call {PHONE}."
        source = set_title(source, title)
        source = set_meta(source, "name", "description", desc)
        source = set_meta(source, "property", "og:title", title)
        source = set_meta(source, "property", "og:description", desc)
        targeted = True
    elif city:
        desc = f"24/7 crime scene, trauma, blood and biohazard cleanup in {city}, TX, across Dallas-Fort Worth (DFW) and {SECONDARY_REGION}. Call {PHONE}."
        source = set_meta(source, "name", "description", desc)
        source = set_meta(source, "property", "og:description", desc)
        source = set_meta(source, "name", "twitter:description", desc)
        targeted = True

    if rel in META_OVERRIDES:
        source = set_meta(source, "name", "description", META_OVERRIDES[rel])
        source = set_meta(source, "property", "og:description", META_OVERRIDES[rel])
        source = set_meta(source, "name", "twitter:description", META_OVERRIDES[rel])

    if targeted:
        source = set_meta(source, "name", "geo.region", "US-TX")
        source = set_meta(source, "name", "geo.placename", f"{city}, Texas" if city else REGION_SCHEMA)
        page_url = canonical(source) or (SITE + "/")
        source = inject_geo_schema(source, page_url, city)
        source = inject_geo_block(source, geo_links_for_city(city) if city else geo_links_for_region())

    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for path in ROOT.rglob("*.html"):
        if ".git" in path.parts or "_site" in path.parts:
            continue
        changed += int(apply(path))
    print(f"Geographic SEO strengthened on {changed} HTML files.")


if __name__ == "__main__":
    main()
