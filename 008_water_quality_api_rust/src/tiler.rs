use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use gdal::Dataset;
use md5::{Digest, Md5};
use serde::Deserialize;
use std::collections::HashMap;
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use std::path::Path as FsPath;
use std::sync::{Arc, RwLock};
use tracing::error;

pub type TileCache = Arc<RwLock<HashMap<String, Vec<u8>>>>;

const ORIGIN_SHIFT: f64 = 20037508.342789244;

#[allow(non_camel_case_types)]
type GDALDatasetH = *mut std::ffi::c_void;
#[allow(non_camel_case_types)]
type GDALRasterBandH = *mut std::ffi::c_void;
#[allow(non_camel_case_types)]
type GDALWarpAppOptions = std::ffi::c_void;

extern "C" {
    fn GDALWarpAppOptionsNew(
        papszArgv: *mut *mut c_char,
        psOptionsForBinary: *mut std::ffi::c_void,
    ) -> *mut GDALWarpAppOptions;

    fn GDALWarpAppOptionsFree(psOptions: *mut GDALWarpAppOptions);

    fn GDALWarp(
        pszDest: *const c_char,
        hDstDS: GDALDatasetH,
        nSrcCount: c_int,
        pahSrcDS: *mut GDALDatasetH,
        psOptions: *const GDALWarpAppOptions,
        pbUsageError: *mut c_int,
    ) -> GDALDatasetH;

    fn CSLAddString(
        papszStrList: *mut *mut c_char,
        pszNewString: *const c_char,
    ) -> *mut *mut c_char;

    fn CSLDestroy(papszStrList: *mut *mut c_char);

    fn GDALGetRasterBand(hDS: GDALDatasetH, nBandId: c_int) -> GDALRasterBandH;

    fn GDALGetRasterCount(hDS: GDALDatasetH) -> c_int;

    fn GDALRasterIO(
        hRBand: GDALRasterBandH,
        eRWFlag: c_int,
        nXOff: c_int,
        nYOff: c_int,
        nXSize: c_int,
        nYSize: c_int,
        pData: *mut std::ffi::c_void,
        nBufXSize: c_int,
        nBufYSize: c_int,
        eBufType: c_int,
        nPixelSpace: c_int,
        nLineSpace: c_int,
    ) -> c_int;

    fn GDALClose(hDS: GDALDatasetH);
}

#[derive(Debug, Deserialize)]
pub struct TileQueryParams {
    pub url: Option<String>,
    pub b1: Option<String>,
    pub b2: Option<String>,
    pub b3: Option<String>,
    pub b1_band: Option<usize>,
    pub b2_band: Option<usize>,
    pub b3_band: Option<usize>,
    pub preset: Option<String>,
    pub rescale: Option<String>,
    pub colormap: Option<String>,
    pub colormap_name: Option<String>,
}

/// Generate a 256x256 empty transparent PNG
pub fn generate_transparent_tile() -> Vec<u8> {
    let img = image::RgbaImage::new(256, 256);
    let mut bytes = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut bytes);
    let _ = image::ImageEncoder::write_image(
        encoder,
        &img,
        256,
        256,
        image::ExtendedColorType::Rgba8,
    );
    bytes
}

fn parse_hex_color(hex: &str) -> Option<[u8; 4]> {
    let s = hex.trim().trim_start_matches('#');
    if s.len() == 6 {
        let r = u8::from_str_radix(&s[0..2], 16).ok()?;
        let g = u8::from_str_radix(&s[2..4], 16).ok()?;
        let b = u8::from_str_radix(&s[4..6], 16).ok()?;
        Some([r, g, b, 255])
    } else {
        None
    }
}

fn parse_rescale(s: Option<&str>, default_min: f32, default_max: f32) -> (f32, f32) {
    if let Some(val) = s {
        let parts: Vec<&str> = val.split(',').collect();
        if parts.len() == 2 {
            if let (Ok(min), Ok(max)) = (
                parts[0].trim().parse::<f32>(),
                parts[1].trim().parse::<f32>(),
            ) {
                if max > min {
                    return (min, max);
                }
            }
        }
    }
    (default_min, default_max)
}

/// Warps and reprojects multiple bands for a 256x256 tile directly from a COG
/// into Web Mercator (EPSG:3857) in a single GDALWarp execution pass.
fn read_tile_multiband_warped(
    href: &str,
    z: u32,
    x: u32,
    y: u32,
    resample_method: &str,
    public_dir: &FsPath,
    band_indices: &[usize],
) -> Result<Option<Vec<Vec<f32>>>, String> {
    if band_indices.is_empty() {
        return Ok(None);
    }

    let tile_size = 2.0 * ORIGIN_SHIFT / (1u64 << z) as f64;
    let min_x = -ORIGIN_SHIFT + (x as f64) * tile_size;
    let max_x = -ORIGIN_SHIFT + ((x + 1) as f64) * tile_size;
    let max_y = ORIGIN_SHIFT - (y as f64) * tile_size;
    let min_y = ORIGIN_SHIFT - ((y + 1) as f64) * tile_size;

    let file_path = if let Some(filename) = href.split("/public/").nth(1) {
        public_dir.join(filename).to_string_lossy().to_string()
    } else if href.starts_with("http://") || href.starts_with("https://") {
        format!("/vsicurl/{}", href)
    } else {
        href.to_string()
    };

    let ds = Dataset::open(&file_path)
        .map_err(|e| format!("Failed to open dataset {}: {}", file_path, e))?;
    let mut src_h = ds.c_dataset();

    let c_min_x = CString::new(format!("{:.8}", min_x)).map_err(|e| e.to_string())?;
    let c_min_y = CString::new(format!("{:.8}", min_y)).map_err(|e| e.to_string())?;
    let c_max_x = CString::new(format!("{:.8}", max_x)).map_err(|e| e.to_string())?;
    let c_max_y = CString::new(format!("{:.8}", max_y)).map_err(|e| e.to_string())?;
    let c_resample = CString::new(resample_method).map_err(|e| e.to_string())?;
    let c_dest = CString::new("").map_err(|e| e.to_string())?;

    let mut argv: *mut *mut c_char = std::ptr::null_mut();
    unsafe {
        argv = CSLAddString(argv, b"-t_srs\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"EPSG:3857\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"-te\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, c_min_x.as_ptr());
        argv = CSLAddString(argv, c_min_y.as_ptr());
        argv = CSLAddString(argv, c_max_x.as_ptr());
        argv = CSLAddString(argv, c_max_y.as_ptr());
        argv = CSLAddString(argv, b"-ts\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"256\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"256\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"-r\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, c_resample.as_ptr());
        argv = CSLAddString(argv, b"-of\0".as_ptr() as *const c_char);
        argv = CSLAddString(argv, b"MEM\0".as_ptr() as *const c_char);

        let warp_options = GDALWarpAppOptionsNew(argv, std::ptr::null_mut());
        CSLDestroy(argv);

        if warp_options.is_null() {
            return Err("Failed to create GDALWarpAppOptions".to_string());
        }

        let mut usage_error = 0;
        let dst_ds = GDALWarp(
            c_dest.as_ptr(),
            std::ptr::null_mut(),
            1,
            &mut src_h,
            warp_options,
            &mut usage_error,
        );
        GDALWarpAppOptionsFree(warp_options);

        if dst_ds.is_null() || usage_error != 0 {
            if !dst_ds.is_null() {
                GDALClose(dst_ds);
            }
            return Ok(None);
        }

        let raster_count = GDALGetRasterCount(dst_ds);
        let mut results = Vec::with_capacity(band_indices.len());

        for &band_idx in band_indices {
            let b_idx = band_idx as c_int;
            if b_idx < 1 || b_idx > raster_count {
                GDALClose(dst_ds);
                return Ok(None);
            }

            let band = GDALGetRasterBand(dst_ds, b_idx);
            if band.is_null() {
                GDALClose(dst_ds);
                return Ok(None);
            }

            let mut buffer = vec![0.0f32; 256 * 256];
            let status = GDALRasterIO(
                band,
                0, // GF_Read
                0,
                0,
                256,
                256,
                buffer.as_mut_ptr() as *mut std::ffi::c_void,
                256,
                256,
                6, // GDT_Float32
                0,
                0,
            );

            if status != 0 {
                GDALClose(dst_ds);
                return Ok(None);
            }

            results.push(buffer);
        }

        GDALClose(dst_ds);

        let has_data = results
            .iter()
            .any(|buf| buf.iter().any(|&v| v > 0.0 && v.is_finite()));
        if !has_data {
            return Ok(None);
        }

        Ok(Some(results))
    }
}

/// Warps and reprojects a single band for a 256x256 tile directly from the COG into Web Mercator (EPSG:3857).
fn read_tile_band_warped(
    href: &str,
    z: u32,
    x: u32,
    y: u32,
    resample_method: &str,
    public_dir: &FsPath,
    band_idx: usize,
) -> Result<Option<Vec<f32>>, String> {
    let mb = read_tile_multiband_warped(
        href,
        z,
        x,
        y,
        resample_method,
        public_dir,
        &[band_idx],
    )?;
    Ok(mb.and_then(|mut v| v.pop()))
}

/// Maps NDVI / NDWI normalized index [-1.0..1.0] to an RGBA color ramp
fn index_to_rgba(val: f32, preset: &str) -> [u8; 4] {
    if !val.is_finite() {
        return [0, 0, 0, 0];
    }

    if preset == "ndwi" {
        // NDWI: Water bodies have positive values, land/clouds negative
        if val <= 0.0 {
            [0, 0, 0, 0] // Non-water transparent
        } else if val < 0.2 {
            [176, 224, 230, 255] // Powder Blue (Shallow / Mixed)
        } else if val < 0.4 {
            [30, 144, 255, 255] // Dodger Blue (Clear water)
        } else {
            [0, 0, 139, 255] // Deep Dark Blue
        }
    } else {
        // NDVI: RdYlGn palette
        if val < 0.0 {
            [165, 42, 42, 255] // Brown (water/barren)
        } else if val < 0.2 {
            [254, 224, 139, 255] // Light Orange/Yellow (sparse vegetation)
        } else if val < 0.4 {
            [217, 239, 139, 255] // Yellow-Green
        } else if val < 0.6 {
            [102, 189, 99, 255] // Green (moderate vegetation)
        } else {
            [0, 104, 55, 255] // Dark Green (dense canopy)
        }
    }
}

pub fn render_tile_png(
    z: u32,
    x: u32,
    y: u32,
    params: &TileQueryParams,
    public_dir: &FsPath,
) -> Result<Vec<u8>, String> {
    // Case 1: Single band COG / Classification Map (e.g. Water Quality classification GeoTIFF)
    if let Some(ref single_url) = params.url {
        let band_data = read_tile_band_warped(single_url, z, x, y, "near", public_dir, 1)?;
        let band = match band_data {
            Some(b) => b,
            None => return Ok(generate_transparent_tile()),
        };

        // Parse custom colormap or fallback to Water Quality defaults
        let mut custom_map: HashMap<u8, [u8; 4]> = HashMap::new();
        custom_map.insert(0, [0, 0, 0, 0]); // Background
        custom_map.insert(1, [33, 150, 243, 255]); // Clear Water #2196F3
        custom_map.insert(2, [232, 67, 15, 255]); // High Turbidity #E8430F
        custom_map.insert(3, [190, 255, 107, 255]); // High Chlorophyll #BEFF6B
        custom_map.insert(4, [27, 138, 10, 255]); // Surface Algae #1B8A0A
        custom_map.insert(5, [122, 0, 0, 255]); // Anomaly #7A0000

        if let Some(ref cm_json) = params.colormap {
            if let Ok(user_map) = serde_json::from_str::<HashMap<String, String>>(cm_json) {
                for (k, hex) in user_map {
                    if let (Ok(key_num), Some(rgba)) = (k.parse::<u8>(), parse_hex_color(&hex)) {
                        custom_map.insert(key_num, rgba);
                    }
                }
            }
        }

        let mut rgba = vec![0u8; 256 * 256 * 4];
        for i in 0..(256 * 256) {
            let class_val = band[i].round() as u8;
            let color = custom_map.get(&class_val).unwrap_or(&[0, 0, 0, 0]);
            let idx = i * 4;
            rgba[idx] = color[0];
            rgba[idx + 1] = color[1];
            rgba[idx + 2] = color[2];
            rgba[idx + 3] = color[3];
        }

        let mut png_bytes = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        image::ImageEncoder::write_image(
            encoder,
            &rgba,
            256,
            256,
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("PNG encoding error: {}", e))?;

        return Ok(png_bytes);
    }

    // Case 2: Spectral Indices (NDVI, NDWI) with 2 bands
    let preset = params.preset.as_deref().unwrap_or("true_color");
    if preset == "ndvi" || preset == "ndwi" {
        let b1_url = params.b1.as_deref().ok_or("Missing b1 for index")?;
        let b2_url = params.b2.as_deref().ok_or("Missing b2 for index")?;

        let is_menut = b1_url.to_lowercase().contains("menut")
            || b1_url.to_lowercase().contains("geneo")
            || b1_url.to_lowercase().contains("icgc");

        let b1_band = params.b1_band.unwrap_or(if is_menut {
            if preset == "ndvi" { 7 } else { 2 } // NDVI: NIR (7), NDWI: Green (2)
        } else {
            1
        });
        let b2_band = params.b2_band.unwrap_or(if is_menut {
            if preset == "ndvi" { 3 } else { 7 } // NDVI: Red (3), NDWI: NIR (7)
        } else {
            1
        });

        let (b1_vec, b2_vec) = if b1_url == b2_url {
            let multi_res = read_tile_multiband_warped(
                b1_url,
                z,
                x,
                y,
                "bilinear",
                public_dir,
                &[b1_band, b2_band],
            )?;

            match multi_res {
                Some(buffers) if buffers.len() == 2 => {
                    let mut it = buffers.into_iter();
                    let b1 = it.next().unwrap();
                    let b2 = it.next().unwrap();
                    (b1, b2)
                }
                _ => return Ok(generate_transparent_tile()),
            }
        } else {
            let (b1_res, b2_res) = rayon::join(
                || read_tile_band_warped(b1_url, z, x, y, "bilinear", public_dir, b1_band),
                || read_tile_band_warped(b2_url, z, x, y, "bilinear", public_dir, b2_band),
            );

            let b1 = b1_res?;
            let b2 = b2_res?;

            if b1.is_none() || b2.is_none() {
                return Ok(generate_transparent_tile());
            }

            (b1.unwrap(), b2.unwrap())
        };

        let mut rgba = vec![0u8; 256 * 256 * 4];
        for i in 0..(256 * 256) {
            let v1 = b1_vec[i];
            let v2 = b2_vec[i];
            let denom = v1 + v2;
            let index_val = if denom.abs() < 1e-4 {
                f32::NAN
            } else {
                (v1 - v2) / denom
            };

            let color = index_to_rgba(index_val, preset);
            let idx = i * 4;
            rgba[idx] = color[0];
            rgba[idx + 1] = color[1];
            rgba[idx + 2] = color[2];
            rgba[idx + 3] = color[3];
        }

        let mut png_bytes = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
        image::ImageEncoder::write_image(
            encoder,
            &rgba,
            256,
            256,
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("PNG encoding error: {}", e))?;

        return Ok(png_bytes);
    }

    // Case 3: 3-band Multi-spectral Composites (RGB True Color / False Color)
    let b1_url = params.b1.as_deref().ok_or("Missing band b1 (red)")?;
    let b2_url = params.b2.as_deref().ok_or("Missing band b2 (green)")?;
    let b3_url = params.b3.as_deref().ok_or("Missing band b3 (blue)")?;

    let is_menut = b1_url.to_lowercase().contains("menut")
        || b1_url.to_lowercase().contains("geneo")
        || b1_url.to_lowercase().contains("icgc");

    // 1-based band indices: Sentinel-2 separate files default to 1; Menut 7-band COG defaults to R:3, G:2, B:1
    let b1_band = params.b1_band.unwrap_or(if is_menut { 3 } else { 1 });
    let b2_band = params.b2_band.unwrap_or(if is_menut { 2 } else { 1 });
    let b3_band = params.b3_band.unwrap_or(if is_menut { 1 } else { 1 });

    let (b1_vec, b2_vec, b3_vec) = if b1_url == b2_url && b2_url == b3_url {
        let multi_res = read_tile_multiband_warped(
            b1_url,
            z,
            x,
            y,
            "bilinear",
            public_dir,
            &[b1_band, b2_band, b3_band],
        )?;

        match multi_res {
            Some(buffers) if buffers.len() == 3 => {
                let mut it = buffers.into_iter();
                let b1 = it.next().unwrap();
                let b2 = it.next().unwrap();
                let b3 = it.next().unwrap();
                (b1, b2, b3)
            }
            _ => return Ok(generate_transparent_tile()),
        }
    } else {
        let ((b1_res, b2_res), b3_res) = rayon::join(
            || {
                rayon::join(
                    || read_tile_band_warped(b1_url, z, x, y, "bilinear", public_dir, b1_band),
                    || read_tile_band_warped(b2_url, z, x, y, "bilinear", public_dir, b2_band),
                )
            },
            || read_tile_band_warped(b3_url, z, x, y, "bilinear", public_dir, b3_band),
        );

        let b1 = b1_res?;
        let b2 = b2_res?;
        let b3 = b3_res?;

        if b1.is_none() || b2.is_none() || b3.is_none() {
            return Ok(generate_transparent_tile());
        }

        (b1.unwrap(), b2.unwrap(), b3.unwrap())
    };

    let default_max = if is_menut { 2500.0 } else { 3000.0 };
    let (min_val, max_val) = parse_rescale(params.rescale.as_deref(), 0.0, default_max);
    let scale = 255.0 / (max_val - min_val);

    let mut rgba = vec![0u8; 256 * 256 * 4];
    for i in 0..(256 * 256) {
        let r = b1_vec[i];
        let g = b2_vec[i];
        let b = b3_vec[i];

        if r <= 0.0 && g <= 0.0 && b <= 0.0 {
            // NoData / outside footprint
            continue;
        }

        let r_u8 = ((r - min_val) * scale).clamp(0.0, 255.0) as u8;
        let g_u8 = ((g - min_val) * scale).clamp(0.0, 255.0) as u8;
        let b_u8 = ((b - min_val) * scale).clamp(0.0, 255.0) as u8;

        let idx = i * 4;
        rgba[idx] = r_u8;
        rgba[idx + 1] = g_u8;
        rgba[idx + 2] = b_u8;
        rgba[idx + 3] = 255;
    }

    let mut png_bytes = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    image::ImageEncoder::write_image(
        encoder,
        &rgba,
        256,
        256,
        image::ExtendedColorType::Rgba8,
    )
    .map_err(|e| format!("PNG encoding error: {}", e))?;

    Ok(png_bytes)
}

pub async fn tile_handler(
    Path((z, x, raw_y)): Path<(u32, u32, String)>,
    Query(params): Query<TileQueryParams>,
    State(state): State<super::AppState>,
) -> Response {
    let y_str = raw_y.trim_end_matches(".png");
    let y: u32 = match y_str.parse() {
        Ok(val) => val,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                [(header::CONTENT_TYPE, "text/plain")],
                "Invalid Y tile coordinate",
            )
                .into_response();
        }
    };

    // Deterministic hash key for tile caching
    let cache_key = {
        let mut hasher = Md5::new();
        hasher.update(format!("{}/{}/{}_{:?}", z, x, y, params).as_bytes());
        format!("{:x}", hasher.finalize())
    };

    // Fast memory cache lookup (< 0.1ms)
    {
        let cache = state.tile_cache.read().unwrap();
        if let Some(cached_bytes) = cache.get(&cache_key) {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
            headers.insert(
                header::CACHE_CONTROL,
                "public, max-age=86400".parse().unwrap(),
            );
            return (StatusCode::OK, headers, cached_bytes.clone()).into_response();
        }
    }

    let public_dir = state.output_dir.clone();
    let render_res = tokio::task::spawn_blocking(move || {
        render_tile_png(z, x, y, &params, &public_dir)
    })
    .await;

    match render_res {
        Ok(Ok(png_bytes)) => {
            // Save to in-memory tile cache
            {
                let mut cache = state.tile_cache.write().unwrap();
                if cache.len() > 3000 {
                    // Simple safeguard to prevent memory ballooning
                    cache.clear();
                }
                cache.insert(cache_key, png_bytes.clone());
            }

            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
            headers.insert(
                header::CACHE_CONTROL,
                "public, max-age=86400".parse().unwrap(),
            );
            (StatusCode::OK, headers, png_bytes).into_response()
        }
        Ok(Err(err_msg)) => {
            error!("Tile render error: {}", err_msg);
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
            (StatusCode::OK, headers, generate_transparent_tile()).into_response()
        }
        Err(join_err) => {
            error!("Task spawn error for tile: {}", join_err);
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "text/plain".parse().unwrap());
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                b"Internal worker error".to_vec(),
            )
                .into_response()
        }
    }
}
