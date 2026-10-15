#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Manager};

const CACHE_MAX_AGE_SECS: u64 = 14 * 24 * 60 * 60;
const USER_AGENT: &str = "WikiCanvas/1.0.0 (desktop; Tauri)";

fn valid_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 128
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == ':')
}

fn store_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("store");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("wiki");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

#[tauri::command]
fn kv_all(app: AppHandle) -> Result<HashMap<String, serde_json::Value>, String> {
    let dir = store_dir(&app)?;
    let mut out = HashMap::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let stem = match path.file_stem().and_then(|s| s.to_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };
        if !valid_key(&stem) {
            continue;
        }
        let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
            out.insert(stem, v);
        }
    }
    Ok(out)
}

#[tauri::command]
fn kv_set(app: AppHandle, key: String, value: serde_json::Value) -> Result<(), String> {
    if !valid_key(&key) {
        return Err("invalid key".into());
    }
    let dir = store_dir(&app)?;
    let text = serde_json::to_string(&value).map_err(|e| e.to_string())?;
    let dest = dir.join(format!("{key}.json"));
    let tmp = dir.join(format!(".{key}.json.tmp"));
    std::fs::write(&tmp, text).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn kv_remove(app: AppHandle, key: String) -> Result<(), String> {
    if !valid_key(&key) {
        return Err("invalid key".into());
    }
    let dir = store_dir(&app)?;
    let dest = dir.join(format!("{key}.json"));
    if dest.exists() {
        std::fs::remove_file(&dest).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn cache_path_for(dir: &std::path::Path, url: &str) -> PathBuf {
    let mut h = Sha256::new();
    h.update(url.as_bytes());
    let hex = format!("{:x}", h.finalize());
    dir.join(format!("{hex}.body"))
}

/// Downloads https://*.wikipedia.org URLs only, caching on disk.
/// Reuses cache younger than 14 days, and any cache as offline fallback.
#[tauri::command]
fn wiki_get(app: AppHandle, url: String) -> Result<String, String> {
    let parsed = url::Url::parse(&url).map_err(|_| "invalid url".to_string())?;
    if parsed.scheme() != "https" {
        return Err("only https allowed".into());
    }
    let host = parsed.host_str().unwrap_or_default().to_lowercase();
    if host != "wikipedia.org" && !host.ends_with(".wikipedia.org") {
        return Err("only wikipedia.org allowed".into());
    }

    let dir = cache_dir(&app)?;
    let path = cache_path_for(&dir, &url);

    if let Ok(meta) = std::fs::metadata(&path) {
        if let Ok(mtime) = meta.modified() {
            if SystemTime::now()
                .duration_since(mtime)
                .unwrap_or(Duration::MAX)
                .as_secs()
                < CACHE_MAX_AGE_SECS
            {
                if let Ok(cached) = std::fs::read_to_string(&path) {
                    return Ok(cached);
                }
            }
        }
    }

    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    match client.get(&url).send() {
        Ok(resp) => {
            if !resp.status().is_success() {
                // Fall back to stale cache if the network call failed.
                if let Ok(cached) = std::fs::read_to_string(&path) {
                    return Ok(cached);
                }
                return Err(format!("wikipedia status {}", resp.status()));
            }
            let text = resp.text().map_err(|e| e.to_string())?;
            let _ = std::fs::write(&path, &text);
            Ok(text)
        }
        Err(e) => {
            if let Ok(cached) = std::fs::read_to_string(&path) {
                return Ok(cached);
            }
            Err(format!("download failed: {e}"))
        }
    }
}

#[tauri::command]
fn open_external(_app: AppHandle, url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|_| "invalid url".to_string())?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("only http/https allowed".into());
    }
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            kv_all,
            kv_set,
            kv_remove,
            wiki_get,
            open_external,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Wiki Canvas");
}
