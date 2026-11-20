mod processor;
mod stac;
mod tiler;

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::{error, info};

#[derive(Clone)]
pub struct AppState {
    pub output_dir: PathBuf,
    pub http_client: reqwest::Client,
    pub tile_cache: tiler::TileCache,
    pub stac_cache: stac::StacCache,
}

#[derive(Debug, Deserialize)]
struct AnalyzeRequest {
    stac_item_id: String,
    bbox: [f64; 4], // [min_lng, min_lat, max_lng, max_lat]
    #[serde(default)]
    satellite: Option<String>,
    #[serde(default)]
    assets: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
struct AnalyzeResponse {
    status: String,
    classification_url: String,
    rgb_url: String,
    job_id: String,
    cached: bool,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    detail: String,
}

#[derive(Debug, Deserialize)]
struct ExactCloudsRequest {
    bbox: [f64; 4], // [min_lng, min_lat, max_lng, max_lat]
    #[serde(default)]
    polygon: Option<Vec<[f64; 2]>>, // Optional [[lng, lat], ...]
    items: Vec<processor::ExactCloudItem>,
}

#[derive(Debug, Serialize)]
struct ExactCloudsResponse {
    status: String,
    results: HashMap<String, processor::PassCloudResult>,
    scanned_passes: usize,
    elapsed_ms: u128,
}

fn cleanup_old_files(dir: &Path) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        let now = SystemTime::now();
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("tif") {
                if let Ok(metadata) = std::fs::metadata(&path) {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(age) = now.duration_since(modified) {
                            if age.as_secs() > 3600 {
                                let _ = std::fs::remove_file(&path);
                            }
                        }
                    }
                }
            }
        }
    }
}

async fn analyze_handler(
    State(state): State<AppState>,
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, (StatusCode, Json<ErrorResponse>)> {
    let bbox_str = format!(
        "{:.4}_{:.4}_{:.4}_{:.4}",
        payload.bbox[0], payload.bbox[1], payload.bbox[2], payload.bbox[3]
    );

    let hash_input = format!("{}_{}", payload.stac_item_id, bbox_str);
    let mut hasher = Md5::new();
    hasher.update(hash_input.as_bytes());
    let hash_digest = format!("{:x}", hasher.finalize());
    let hash_suffix = &hash_digest[..10];

    let clean_id = payload.stac_item_id.replace('/', "_");
    let class_file = format!("classification_{}_{}.tif", clean_id, hash_suffix);
    let rgb_file = format!("rgb_{}_{}.tif", clean_id, hash_suffix);

    let class_path = state.output_dir.join(&class_file);
    let rgb_path = state.output_dir.join(&rgb_file);

    let classification_url = format!("http://water-quality-api:8000/public/{}", class_file);
    let rgb_url = format!("http://water-quality-api:8000/public/{}", rgb_file);

    // Instant cache check (< 1ms)
    if class_path.exists() && rgb_path.exists() {
        info!("Serving from cache: {}", class_file);
        return Ok(Json(AnalyzeResponse {
            status: "success".to_string(),
            classification_url,
            rgb_url,
            job_id: class_file,
            cached: true,
        }));
    }

    // Determine target satellite platform
    let is_menut = payload.satellite.as_deref() == Some("menut")
        || payload.stac_item_id.starts_with("menut_")
        || payload.stac_item_id.starts_with("geneo");

    // Fetch or use direct STAC assets
    let hrefs = if let Some(direct_assets) = payload.assets {
        if !direct_assets.is_empty() {
            direct_assets
        } else {
            stac::get_asset_hrefs(&state.http_client, &payload.stac_item_id, payload.satellite.as_deref())
                .await
                .map_err(|e| {
                    error!("STAC fetch error: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse { detail: e }),
                    )
                })?
        }
    } else {
        stac::get_asset_hrefs(&state.http_client, &payload.stac_item_id, payload.satellite.as_deref())
            .await
            .map_err(|e| {
                error!("STAC fetch error: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { detail: e }),
                )
            })?
    };

    // Offload heavy raster processing to worker thread pool
    let output_dir_clone = state.output_dir.clone();
    let item_id = payload.stac_item_id.clone();
    let bbox = payload.bbox;
    let c_file = class_file.clone();
    let r_file = rgb_file.clone();

    let process_res = tokio::task::spawn_blocking(move || {
        if is_menut {
            processor::process_menut_water_quality(
                &item_id,
                &bbox,
                &hrefs,
                &output_dir_clone,
                &c_file,
                &r_file,
            )
        } else {
            processor::process_water_quality(
                &item_id,
                &bbox,
                &hrefs,
                &output_dir_clone,
                &c_file,
                &r_file,
            )
        }
    })
    .await
    .map_err(|e| {
        error!("Task spawn error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                detail: e.to_string(),
            }),
        )
    })?;

    if let Err(err_msg) = process_res {
        error!("Processing error: {}", err_msg);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { detail: err_msg }),
        ));
    }

    Ok(Json(AnalyzeResponse {
        status: "success".to_string(),
        classification_url,
        rgb_url,
        job_id: class_file,
        cached: false,
    }))
}

async fn exact_clouds_handler(
    Json(payload): Json<ExactCloudsRequest>,
) -> Result<Json<ExactCloudsResponse>, (StatusCode, Json<ErrorResponse>)> {
    let start_time = std::time::Instant::now();
    let bbox = payload.bbox;
    let polygon = payload.polygon;
    let items = payload.items;
    let count = items.len();

    let results = tokio::task::spawn_blocking(move || {
        let poly_slice = polygon.as_deref();
        processor::calculate_exact_clouds_batch(&bbox, poly_slice, &items)
    })
    .await
    .map_err(|e| {
        error!("Exact clouds task error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                detail: e.to_string(),
            }),
        )
    })?;

    let elapsed_ms = start_time.elapsed().as_millis();
    info!(
        "☁️ Exact SCL cloud scan completed for {} passes in {}ms",
        count, elapsed_ms
    );

    Ok(Json(ExactCloudsResponse {
        status: "success".to_string(),
        results,
        scanned_passes: count,
        elapsed_ms,
    }))
}

async fn root_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "Unified Geospatial Rust API is running",
        "engine": "Pure Rust Axum + GDAL + Rayon",
        "endpoints": [
            "POST /api/analyze",
            "GET  /api/tiles/:z/:x/:y",
            "POST /api/stac/search",
            "POST /api/passes/exact-clouds",
            "GET  /public/*"
        ],
        "version": "2.1.0"
    }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info,water_quality_api_rust=debug")
        .init();

    processor::init_gdal_options();
    info!("✅ GDAL global COG and VSI caching options initialized");

    let output_dir = std::env::var("OUTPUT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./public"));

    std::fs::create_dir_all(&output_dir).expect("Failed to create public output directory");

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to build HTTP client");

    let tile_cache = Arc::new(RwLock::new(HashMap::new()));
    let stac_cache = Arc::new(RwLock::new(HashMap::new()));

    let state = AppState {
        output_dir: output_dir.clone(),
        http_client,
        tile_cache,
        stac_cache,
    };

    // Spawn background task to delete files older than 1 hour
    let cleanup_dir = output_dir.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(600)); // Every 10 min
        loop {
            interval.tick().await;
            cleanup_old_files(&cleanup_dir);
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/api/analyze", post(analyze_handler))
        .route("/api/tiles/:z/:x/:y", get(tiler::tile_handler))
        .route("/api/stac/search", post(stac::stac_search_handler))
        .route("/api/passes/exact-clouds", post(exact_clouds_handler))
        .nest_service("/public", ServeDir::new(&output_dir))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    info!("🚀 Unified Geospatial Rust API starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
