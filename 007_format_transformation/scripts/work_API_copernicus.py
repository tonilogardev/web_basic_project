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
coords_str = os.getenv("SEARCH_BBOX", "").strip()
start_date = os.getenv("SEARCH_START_DATE", "").strip()
end_date = os.getenv("SEARCH_END_DATE", "").strip()

# Map CDSE product type to AWS Earth Search collection name
product_type = os.getenv("SEARCH_PRODUCT_TYPE", "S2MSI2A").strip()
collection = "sentinel-2-l2a" if product_type == "S2MSI2A" else "sentinel-2-l1c"

max_cloud = float(os.getenv("SEARCH_MAX_CLOUD_COVER", "50"))
max_results = int(os.getenv("SEARCH_TOP_RESULTS", "100"))

# Validate
if not coords_str:
    print("ERROR: SEARCH_BBOX not set. Format: 'sw_lat,sw_lon,ne_lat,ne_lon'")
    sys.exit(1)
if not start_date or not end_date:
    print("ERROR: SEARCH_START_DATE and SEARCH_END_DATE must be set. Format: 'YYYY-MM-DD'")
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

# Create output directory
output_dir = os.path.join(script_dir, "..", "output")
os.makedirs(output_dir, exist_ok=True)

def download_file(url, output_path):
    if os.path.exists(output_path):
        print(f"  -> Already exists: {os.path.basename(output_path)}")
        return
    print(f"  -> Downloading {os.path.basename(output_path)}...", end="", flush=True)
    try:
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(output_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(" Done!")
    except Exception as e:
        print(f" Failed! Error: {e}")

for i, feat in enumerate(features, 1):
    props = feat.get("properties", {})
    scene_id = feat.get("id", "unknown")
    date = props.get("datetime", "unknown")[:10]
    cloud = props.get("eo:cloud_cover", "N/A")

    # Get band URLs
    assets = feat.get("assets", {})
    bands = sorted(assets.keys())

    print(f"\n--- Scene {i}: {scene_id} ---")
    print(f"  Date:        {date}")
    print(f"  Cloud cover: {cloud}%")

    # Download ONLY the visual (True Color RGB) band
    for band_name in bands:
        if band_name != "visual":
            continue
            
        href = assets[band_name].get("href")
        if not href:
            continue
            
        # Determine file extension
        ext = ".tif" if "tif" in href.lower() else ".jp2" if "jp2" in href.lower() else ""
        if not ext:
            ext = os.path.splitext(href)[1].split('?')[0] # remove query params if any

        filename = f"{scene_id}_{band_name}{ext}"
        filepath = os.path.join(output_dir, filename)
        
        download_file(href, filepath)

# Check for more results
links = data.get("links", [])
next_link = [l["href"] for l in links if l.get("rel") == "next"]
if next_link:
    print(f"\n[More results available. Use 'next' link for pagination]")
