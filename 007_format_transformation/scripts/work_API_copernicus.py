#!/usr/bin/env python3
"""
Search Sentinel-2 COG products via AWS Earth Search STAC API.
Returns product list with scene ID, date, cloud cover, and band URLs.
"""

import os
import sys
import requests
from dotenv import load_dotenv

# STAC API endpoint (AWS Earth Search)
STAC_API = "https://earth-search.aws.element84.com/v1/search"

# Load .env from script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, ".env"))

# --- Read variables ---
coords_str = os.getenv("COORDINATES", "").strip()
start_date = os.getenv("START_DATE", "").strip()
end_date = os.getenv("END_DATE", "").strip()
collection = os.getenv("L1C_L2A", "sentinel-2-l2a").strip()
max_cloud = float(os.getenv("MAX_CLOUD_COVER", "50"))
max_results = int(os.getenv("MAX_RESULTS", "100"))

# Validate
if not coords_str:
    print("ERROR: COORDINATES not set. Format: 'sw_lat,sw_lon,ne_lat,ne_lon'")
    sys.exit(1)
if not start_date or not end_date:
    print("ERROR: START_DATE and END_DATE must be set. Format: 'YYYY-MM-DD'")
    sys.exit(1)

# Parse coordinates
try:
    bbox = [float(c) for c in coords_str.split(",")]
    if len(bbox) != 4:
        raise ValueError
    bbox_formatted = [bbox[1], bbox[0], bbox[3], bbox[2]]  # lon,lat,lon,lat
except ValueError:
    print(f"ERROR: Invalid COORDINATES format: '{coords_str}'. Use 'sw_lat,sw_lon,ne_lat,ne_lon'")
    sys.exit(1)

# Build STAC query
query = {
    "collections": [collection],
    "bbox": bbox_formatted,
    "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
    "limit": max_results,
    "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    "query": {"eo:cloud_cover": {"lt": max_cloud}},
}

print(f"Searching: {collection}")
print(f"BBOX: {bbox}")
print(f"Date: {start_date} to {end_date}")
print(f"Max cloud cover: {max_cloud}%")
print(f"Max results: {max_results}")
print("-" * 60)

# Execute search
try:
    resp = requests.post(STAC_API, json=query, timeout=30)
    resp.raise_for_status()
except requests.RequestException as e:
    print(f"ERROR: Request failed: {e}")
    sys.exit(1)

data = resp.json()
features = data.get("features", [])

if not features:
    print("No scenes found.")
    sys.exit(0)

print(f"Found {len(features)} scenes:\n")

for i, feat in enumerate(features, 1):
    props = feat.get("properties", {})
    scene_id = feat.get("id", "unknown")
    date = props.get("datetime", "unknown")[:10]
    cloud = props.get("eo:cloud_cover", "N/A")

    # Get band URLs
    assets = feat.get("assets", {})
    bands = sorted(assets.keys())
    band_list = ", ".join(b for b in bands if not b.startswith("thumbnail"))

    print(f"--- Scene {i} ---")
    print(f"  ID:          {scene_id}")
    print(f"  Date:        {date}")
    print(f"  Cloud cover: {cloud}%")
    print(f"  Bands:       {band_list}")

    # Print first band URL as example
    if "B04" in assets:
        print(f"  Example URL: {assets['B04']['href'][:80]}...")
    print()

# Check for more results
links = data.get("links", [])
next_link = [l["href"] for l in links if l.get("rel") == "next"]
if next_link:
    print(f"[More results available. Use 'next' link for pagination]")
