from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def encode_attr(value: str) -> str:
    return html.escape(value, quote=True)


def replace_first(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Expected one {label}; found {count}")
    return updated


def set_title(text: str, title: str) -> str:
    return replace_first(text, r"<title>.*?</title>", f"<title>{encode_attr(title)}</title>", "title")


def set_meta(text: str, key_type: str, key: str, value: str) -> str:
    escaped = encode_attr(value)
    pattern = rf'(<meta {re.escape(key_type)}="{re.escape(key)}" content=")[^"]*("/>)'
    return replace_first(text, pattern, rf"\g<1>{escaped}\g<2>", f"meta {key_type}={key}")


def update_service_schema(text: str, *, page_url: str, title: str, breadcrumb: str,
                          description: str, city: str, services: list[str]) -> str:
    pattern = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
    matches = list(pattern.finditer(text))
    for match in matches:
        raw = match.group(1)
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        graph = data.get("@graph") if isinstance(data, dict) else None
        if not isinstance(graph, list):
            continue

        service = None
        breadcrumbs = None
        for node in graph:
            if not isinstance(node, dict):
                continue
            if node.get("@type") == "Service" and node.get("url") == page_url:
                service = node
            if node.get("@type") == "BreadcrumbList":
                breadcrumbs = node

        if service is None:
            continue

        service["name"] = title
        service["description"] = description
        service["serviceType"] = services
        service["areaServed"] = [
            {"@type": "City", "name": city},
            {"@type": "Place", "name": "Dallas-Fort Worth Metroplex, Texas"},
            {"@type": "Place", "name": "North Texas"},
        ]

        if isinstance(breadcrumbs, dict):
            items = breadcrumbs.get("itemListElement")
            if isinstance(items, list) and items:
                last = items[-1]
                if isinstance(last, dict):
                    last["name"] = breadcrumb

        serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        return text[:match.start(1)] + serialized + text[match.end(1):]

    raise RuntimeError(f"Service schema not found for {page_url}")


def update_page(path: str, *, old_titles: set[str], title: str, description: str,
                schema: dict | None = None) -> bool:
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")

    current_match = re.search(r"<title>(.*?)</title>", text, re.S)
    if not current_match:
        raise RuntimeError(f"No title in {path}")
    current_title = html.unescape(current_match.group(1))
    if current_title not in old_titles | {title}:
        raise RuntimeError(f"Unexpected title in {path}: {current_title}")

    updated = set_title(text, title)
    updated = set_meta(updated, "name", "description", description)
    updated = set_meta(updated, "property", "og:title", title)
    updated = set_meta(updated, "property", "og:description", description)
    updated = set_meta(updated, "name", "twitter:title", title)
    updated = set_meta(updated, "name", "twitter:description", description)
    updated = set_meta(updated, "name", "twitter:image:alt", title)

    if schema:
        updated = update_service_schema(updated, **schema)

    if updated == text:
        return False
    file_path.write_text(updated, encoding="utf-8")
    return True


def touch_sitemap(urls: list[str], date: str = "2026-09-15") -> bool:
    path = ROOT / "sitemap.website.xml"
    text = path.read_text(encoding="utf-8")
    updated = text
    for url in urls:
        block_pattern = re.compile(
            rf"(<url>\s*<loc>{re.escape(url)}</loc>.*?<lastmod>)([^<]+)(</lastmod>)",
            re.S,
        )
        updated, count = block_pattern.subn(rf"\g<1>{date}\g<3>", updated, count=1)
        if count != 1:
            raise RuntimeError(f"Sitemap entry not found: {url}")
    if updated == text:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> None:
    changed: list[str] = []

    dallas_title = "Crime Scene & Biohazard Cleanup Dallas TX | CSI"
    dallas_desc = (
        "24/7 crime scene and biohazard cleanup in Dallas, TX, including blood, trauma, "
        "unattended death and decomposition cleanup. Call 940-654-6334."
    )
    if update_page(
        "dallas-tx-response/index.html",
        old_titles={"Crime Scene Cleanup Dallas | CSI: Clean Scene Investigators"},
        title=dallas_title,
        description=dallas_desc,
        schema={
            "page_url": "https://cleansceneinvestigators.com/dallas-tx-response/",
            "title": dallas_title,
            "breadcrumb": "Crime Scene & Biohazard Cleanup Dallas TX",
            "description": "Crime scene and biohazard cleanup in Dallas, TX, including blood, trauma, unattended death, decomposition and related remediation.",
            "city": "Dallas, Texas",
            "services": [
                "Crime scene cleanup",
                "Biohazard cleanup",
                "Blood cleanup",
                "Trauma cleanup",
                "Unattended death cleanup",
                "Decomposition cleanup",
            ],
        },
    ):
        changed.append("dallas-tx-response/index.html")

    fort_worth_title = "Crime Scene & Biohazard Cleanup Fort Worth TX | CSI"
    fort_worth_desc = (
        "24/7 crime scene and biohazard cleanup in Fort Worth, TX, including blood, trauma, "
        "unattended death and decomposition cleanup. Call 940-654-6334."
    )
    if update_page(
        "fort-worth-tx-response/index.html",
        old_titles={"Crime Scene Cleanup Fort Worth TX | CSI: Clean Scene Investigators"},
        title=fort_worth_title,
        description=fort_worth_desc,
        schema={
            "page_url": "https://cleansceneinvestigators.com/fort-worth-tx-response/",
            "title": fort_worth_title,
            "breadcrumb": "Crime Scene & Biohazard Cleanup Fort Worth TX",
            "description": "Crime scene and biohazard cleanup in Fort Worth, TX, including blood, trauma, unattended death, decomposition and related remediation.",
            "city": "Fort Worth, Texas",
            "services": [
                "Crime scene cleanup",
                "Biohazard cleanup",
                "Blood cleanup",
                "Trauma cleanup",
                "Unattended death cleanup",
                "Decomposition cleanup",
            ],
        },
    ):
        changed.append("fort-worth-tx-response/index.html")

    area_title = "DFW Crime Scene & Biohazard Cleanup Service Areas | CSI"
    area_desc = (
        "Crime scene, trauma and biohazard cleanup across Dallas-Fort Worth (DFW) and North Texas, "
        "with qualifying statewide Texas response. Call 940-654-6334."
    )
    if update_page(
        "service-areas-in-texas/index.html",
        old_titles={"Dallas-Fort Worth & North Texas Crime Scene Cleanup Areas | CSI"},
        title=area_title,
        description=area_desc,
        schema=None,
    ):
        changed.append("service-areas-in-texas/index.html")

    sitemap_urls = [
        "https://cleansceneinvestigators.com/dallas-tx-response/",
        "https://cleansceneinvestigators.com/fort-worth-tx-response/",
        "https://cleansceneinvestigators.com/service-areas-in-texas/",
    ]
    if changed and touch_sitemap(sitemap_urls):
        changed.append("sitemap.website.xml")

    print("Precision SEO changes:")
    if changed:
        for item in changed:
            print(f"- {item}")
    else:
        print("- none (already applied)")


if __name__ == "__main__":
    main()
