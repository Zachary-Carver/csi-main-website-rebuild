#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RULES = [
    "/home / 301",
    "/ols/products / 301",
    "/f/* /follow-us/f/:splat/ 301",
    "/home/f/* /follow-us/f/:splat/ 301",
    "/grapevine-tx-response /service-areas-in-texas/ 301",
    "/safety-compliance /safety-and-compliance/ 301",
    "/farmers-branch-tx-response /farmers-branch-response/ 301",
    "/ola/services/vehicle-biohazard-cleanup /vehicle-biohazard-dfw-tx/ 301",
]

path = ROOT / "_redirects"
content = "# CSI canonical and legacy redirects\n" + "\n".join(RULES) + "\n"
if not path.exists() or path.read_text(encoding="utf-8") != content:
    path.write_text(content, encoding="utf-8")
    print("Normalized _redirects")
else:
    print("_redirects already normalized")
