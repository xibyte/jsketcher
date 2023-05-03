#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  tauri::Builder::default()
    // Don't worry about this error, it's just the rust analyzer.
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
