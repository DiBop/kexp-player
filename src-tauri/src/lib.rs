#[tauri::command]
async fn fetch_wfmu_html() -> Result<String, String> {
    reqwest::get("https://wfmu.org/currentliveshows_aggregator.php?ch=1")
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![fetch_wfmu_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
