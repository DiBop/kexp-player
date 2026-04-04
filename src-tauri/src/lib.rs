//! # kexp-player backend
//!
//! Rust backend for the KEXP Player Tauri app.
//!
//! Responsibilities:
//! - Registering Tauri commands callable from the Svelte frontend via `invoke()`
//! - Fetching data from external sources that cannot be reached from the WebView
//!   due to browser CORS restrictions (specifically WFMU's now-playing page)
//! - Hosting the `plugin-shell` integration for opening external URLs

/// Fetches the raw HTML from WFMU's live now-playing aggregator page.
///
/// This command exists solely to work around CORS: WFMU's aggregator endpoint
/// (`wfmu.org/currentliveshows_aggregator.php`) does not return an
/// `Access-Control-Allow-Origin` header, so the Svelte frontend cannot call it
/// directly via `fetch()`. By routing the request through Rust via `reqwest`,
/// we bypass the WebView's CORS enforcement entirely.
///
/// The returned HTML is parsed on the frontend with a regex to extract the
/// current song title and artist. See `src/lib/stations.ts` for the parsing logic.
///
/// # Errors
///
/// Returns a `String` error (surfaced as a rejected `invoke()` promise in JS) if:
/// - The HTTP request fails (network error, DNS failure, timeout)
/// - The response body cannot be decoded as UTF-8 text
#[tauri::command]
async fn fetch_wfmu_html() -> Result<String, String> {
    reqwest::get("https://wfmu.org/currentliveshows_aggregator.php?ch=1")
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

/// Initialises and runs the Tauri application.
///
/// Registers all plugins and Tauri commands, then hands control to the Tauri
/// runtime. This function does not return under normal operation.
///
/// # Panics
///
/// Panics if the Tauri runtime fails to start (e.g. missing WebKit2GTK libraries).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_wfmu_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
