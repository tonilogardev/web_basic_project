use std::collections::HashMap;
use serde::Deserialize;

const STAC_API: &str = "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items";

#[derive(Debug, Deserialize)]
struct StacAsset {
    href: String,
}

#[derive(Debug, Deserialize)]
struct StacItem {
    #[serde(default)]
    assets: HashMap<String, StacAsset>,
}

pub async fn get_asset_hrefs(item_id: &str) -> Result<HashMap<String, String>, String> {
    let url = format!("{}/{}", STAC_API, item_id);
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to request STAC item {}: {}", item_id, e))?;

    if !resp.status().is_success() {
        return Err(format!("STAC API error status {}: {}", resp.status(), url));
    }

    let item: StacItem = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse STAC JSON: {}", e))?;

    let hrefs = item
        .assets
        .into_iter()
        .map(|(k, v)| (k, v.href))
        .collect();

    Ok(hrefs)
}
