#!/usr/bin/env python3
"""Strengthen CSI geographic SEO around Dallas-Fort Worth, DFW, and North Texas.

Idempotent, dependency-free, and safe for the migrated static site. It updates metadata
on core regional/service/city pages and injects one styled regional context panel plus
supplemental geographic WebPage schema without changing page URLs.
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
GEO_STYLE = re.compile(r"\n?<!-- CSI GEO STYLE START -->.*?<!-- CSI GEO STYLE END -->\n?", re.S)

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
    cities = "".join(
        f'<a href="{url}">{html.escape(name)}</a>' for name, url in TOP_CITIES
    )
    return (
        '<section class="csi-geo-seo" data-csi-geo-seo="true" aria-label="Dallas-Fort Worth and North Texas service area">'
        '<div class="csi-geo-seo__header">'
        '<p class="csi-geo-seo__eyebrow">DFW &amp; North Texas service area</p>'
        '<h3 class="csi-geo-seo__title">24/7 response across the Dallas-Fort Worth Metroplex.</h3>'
        '<p class="csi-geo-seo__copy">CSI provides specialized crime scene, trauma and biohazard cleanup throughout DFW and North Texas, including Dallas, Fort Worth, Denton, Plano, Frisco, Arlington, Irving, McKinney and surrounding communities.</p>'
        '</div>'
        f'<nav class="csi-geo-seo__cities" aria-label="Featured DFW service areas">{cities}</nav>'
        '<nav class="csi-geo-seo__links" aria-label="Regional cleanup services">'
        '<a href="/service-areas-in-texas/">Explore all service areas</a>'
        '<a href="/crime-scene-cleaning-dfw/">Crime scene cleanup across DFW</a>'
        '<a href="/biohazard-cleanup-in-dfw/">Biohazard cleanup across DFW</a>'
        '</nav>'
        '</section>'
    )


def geo_links_for_city(city: str) -> str:
    safe_city = html.escape(city)
    return (
        '<section class="csi-geo-seo" data-csi-geo-seo="true" aria-label="Local Dallas-Fort Worth service area">'
        '<div class="csi-geo-seo__header">'
        '<p class="csi-geo-seo__eyebrow">Local service area</p>'
        f'<h3 class="csi-geo-seo__title">{safe_city}, Texas</h3>'
        f'<p class="csi-geo-seo__copy">{safe_city} is served within CSI\'s Dallas-Fort Worth Metroplex and North Texas response area. CSI provides 24/7 crime scene, trauma, blood, unattended death, decomposition and biohazard cleanup after the scene is released.</p>'
        '</div>'
        '<nav class="csi-geo-seo__links" aria-label="Dallas-Fort Worth cleanup resources">'
        '<a href="/service-areas-in-texas/">Dallas-Fort Worth service areas</a>'
        '<a href="/crime-scene-cleaning-dfw/">DFW crime scene cleanup</a>'
        '<a href="/unattended-death-cleanup/">DFW unattended death cleanup</a>'
        '<a href="/biohazard-cleanup-in-dfw/">DFW biohazard cleanup</a>'
        '</nav>'
        '</section>'
    )


def inject_geo_styles(source: str) -> str:
    source = GEO_STYLE.sub("", source)
    css = r'''
<!-- CSI GEO STYLE START -->
<style>
  .csi-geo-seo,
  .csi-geo-seo * {
    box-sizing: border-box;
  }

  .csi-geo-seo {
    --csi-geo-black: #000000;
    --csi-geo-panel: #171717;
    --csi-geo-gold: #c9a227;
    --csi-geo-gold-light: #e7cf76;
    --csi-geo-white: #ffffff;
    --csi-geo-muted: #c2c2c2;
    --csi-geo-line: rgba(201, 162, 39, 0.27);

    width: min(1180px, 100%);
    margin: 42px auto 0;
    padding: 28px 0 2px;
    border-top: 1px solid var(--csi-geo-line);
    color: var(--csi-geo-white);
    background: transparent;
    font-family: Arial, Helvetica, sans-serif;
    text-align: left;
  }

  .csi-geo-seo__header {
    max-width: 920px;
  }

  .csi-geo-seo__eyebrow {
    margin: 0 0 9px;
    color: var(--csi-geo-gold-light) !important;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.16em;
    line-height: 1.5;
    text-transform: uppercase;
  }

  .csi-geo-seo__title {
    margin: 0;
    color: var(--csi-geo-white) !important;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(23px, 2.8vw, 34px);
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.12;
  }

  .csi-geo-seo__copy {
    max-width: 900px;
    margin: 11px 0 0;
    color: var(--csi-geo-muted) !important;
    font-size: 13px;
    line-height: 1.7;
  }

  .csi-geo-seo__cities {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .csi-geo-seo__cities a {
    min-height: 36px;
    padding: 9px 11px;
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--csi-geo-line);
    border-radius: 2px;
    color: var(--csi-geo-gold-light) !important;
    background: rgba(23, 23, 23, 0.96);
    font-size: 10px !important;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.4;
    text-decoration: none !important;
    text-transform: uppercase;
    transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
  }

  .csi-geo-seo__cities a:hover,
  .csi-geo-seo__cities a:focus-visible {
    color: var(--csi-geo-black) !important;
    background: var(--csi-geo-gold);
    border-color: var(--csi-geo-gold);
    transform: translateY(-1px);
  }

  .csi-geo-seo__links {
    margin-top: 18px;
    padding-top: 17px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 24px;
    border-top: 1px solid rgba(201, 162, 39, 0.16);
  }

  .csi-geo-seo__links a {
    color: var(--csi-geo-gold-light) !important;
    font-size: 10px !important;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1.55;
    text-decoration: none !important;
    text-transform: uppercase;
  }

  .csi-geo-seo__links a:hover,
  .csi-geo-seo__links a:focus-visible {
    color: var(--csi-geo-white) !important;
    text-decoration: underline !important;
    text-decoration-color: var(--csi-geo-gold) !important;
    text-underline-offset: 5px;
  }

  .csi-geo-seo a:focus-visible {
    outline: 2px solid var(--csi-geo-gold);
    outline-offset: 4px;
  }

  @media (max-width: 590px) {
    .csi-geo-seo {
      margin-top: 32px;
      padding-top: 24px;
    }

    .csi-geo-seo__cities {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .csi-geo-seo__cities a {
      justify-content: center;
      text-align: center;
    }

    .csi-geo-seo__links {
      display: grid;
      gap: 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .csi-geo-seo__cities a {
      transition: none;
    }
  }
</style>
<!-- CSI GEO STYLE END -->
'''
    return source.replace("</head>", css + "\n</head>", 1)


def inject_geo_block(source: str, inner: str) -> str:
    source = GEO_BLOCK.sub("", source)
    block = "\n<!-- CSI GEO SEO START -->" + inner + "<!-- CSI GEO SEO END -->\n"
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
        source = inject_geo_styles(source)
        source = inject_geo_block(source, geo_links_for_city(city) if city else geo_links_for_region())

    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False


def main() -> int:
    changed = 0
    for path in sorted(ROOT.rglob("index.html")):
        if apply(path):
            changed += 1
    print(f"Geographic SEO updates applied to {changed} pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
