mod processor;
mod stac;

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use md5::{Digest, Md5};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::{error, info};

#[derive(Clone)]
struct AppState {
    output_dir: PathBuf,
}

#[derive(Debug, Deserialize)]
struct AnalyzeRequest {
    stac_item_id: String,
    bbox: [f64; 4], // [min_lng, min_lat, max_lng, max_lat]
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
    State(state): State<Arc<AppState>>,
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

    // Fetch STAC assets
    let hrefs = stac::get_asset_hrefs(&payload.stac_item_id)
        .await
        .map_err(|e| {
            error!("STAC fetch error: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse { detail: e }),
            )
        })?;

    // Offload heavy raster processing to worker thread pool
    let output_dir_clone = state.output_dir.clone();
    let item_id = payload.stac_item_id.clone();
    let bbox = payload.bbox;
    let c_file = class_file.clone();
    let r_file = rgb_file.clone();

    let process_res = tokio::task::spawn_blocking(move || {
        processor::process_water_quality(
            &item_id,
            &bbox,
            &hrefs,
            &output_dir_clone,
            &c_file,
            &r_file,
        )
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

async fn root_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "Water Quality Rust API is running",
        "engine": "Pure Rust Axum + GDAL + Rayon",
        "version": "1.0.0"
    }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info,water_quality_api_rust=debug")
        .init();

    let output_dir = std::env::var("OUTPUT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./public"));

    std::fs::create_dir_all(&output_dir).expect("Failed to create public output directory");

    let state = Arc::new(AppState {
        output_dir: output_dir.clone(),
    });

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
        .nest_service("/public", ServeDir::new(&output_dir))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    info!("🚀 Water Quality Rust API starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
