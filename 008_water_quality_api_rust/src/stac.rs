use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
};
use md5::{Digest, Md5};
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};
use tracing::{error, info};

const STAC_SEARCH_URL: &str = "https://earth-search.aws.element84.com/v1/search";
const STAC_COLLECTION_URL: &str = "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items";

pub type StacCache = Arc<RwLock<HashMap<String, (SystemTime, Value)>>>;

#[derive(Debug, Deserialize)]
struct StacAsset {
    href: String,
}

#[derive(Debug, Deserialize)]
struct StacItem {
    #[serde(default)]
    assets: HashMap<String, StacAsset>,
}

/// Retrieve direct band asset URLs for a specific STAC Item ID
pub async fn get_asset_hrefs(client: &reqwest::Client, item_id: &str) -> Result<HashMap<String, String>, String> {
    let url = format!("{}/{}", STAC_COLLECTION_URL, item_id);
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

/// Proxy and cache STAC searches with instant in-memory responses for repeated queries
pub async fn stac_search_handler(
    State(state): State<super::AppState>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    // Generate deterministic hash of the search payload
    let hash_key = {
        let mut hasher = Md5::new();
        hasher.update(payload.to_string().as_bytes());
        format!("{:x}", hasher.finalize())
    };

    // Check cache (TTL 15 minutes)
    {
        let cache = state.stac_cache.read().unwrap();
        if let Some((timestamp, cached_data)) = cache.get(&hash_key) {
            if let Ok(elapsed) = SystemTime::now().duration_since(*timestamp) {
                if elapsed < Duration::from_secs(900) {
                    info!("⚡ Serving STAC search from memory cache");
                    return Ok(Json(cached_data.clone()));
                }
            }
        }
    }

    info!("🌐 Forwarding STAC search to Earth Search API");
    let resp = state
        .http_client
        .post(STAC_SEARCH_URL)
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            error!("STAC upstream request failed: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({ "error": format!("STAC request error: {}", e) })),
            )
        })?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().await.unwrap_or_default();
        error!("STAC upstream returned status {}: {}", status, err_text);
        return Err((
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            Json(serde_json::json!({ "error": err_text })),
        ));
    }

    let stac_response: Value = resp.json().await.map_err(|e| {
        error!("Failed to parse STAC response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Invalid JSON from STAC upstream" })),
        )
    })?;

    // Store in memory cache
    {
        let mut cache = state.stac_cache.write().unwrap();
        if cache.len() > 500 {
            cache.clear(); // Prune to prevent memory growth
        }
        cache.insert(hash_key, (SystemTime::now(), stac_response.clone()));
    }

    Ok(Json(stac_response))
}
