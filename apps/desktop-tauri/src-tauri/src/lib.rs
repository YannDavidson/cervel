use serde::Serialize;
use std::{net::TcpStream, path::PathBuf, process::{Child, Command, Stdio}, sync::Mutex, time::Duration};
use tauri::{AppHandle, Manager, State};

struct NodeRuntime(Mutex<Option<Child>>);

#[derive(Serialize)]
struct NodeStatus { running: bool, endpoint: String, managed_by_desktop: bool }

fn repo_root() -> PathBuf {
    std::env::var("CERVEL_APP_ROOT").map(PathBuf::from).unwrap_or_else(|_| {
        std::env::current_dir().unwrap_or_default()
    })
}

#[tauri::command]
fn node_status() -> NodeStatus {
    let running = TcpStream::connect_timeout(&"127.0.0.1:4317".parse().unwrap(), Duration::from_millis(250)).is_ok();
    NodeStatus { running, endpoint: "http://127.0.0.1:4317".into(), managed_by_desktop: true }
}

#[tauri::command]
fn start_local_node(runtime: State<NodeRuntime>) -> Result<NodeStatus, String> {
    if node_status().running { return Ok(node_status()); }
    let root = repo_root();
    let cli = root.join("dist/apps/local-node/src/cli.js");
    if !cli.exists() { return Err("Local Node build not found. Run npm run build first.".into()); }
    let child = Command::new("node").arg(cli).arg("serve")
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null())
        .spawn().map_err(|e| format!("Unable to start CERVEL Local Node: {e}"))?;
    *runtime.0.lock().map_err(|_| "Node runtime lock poisoned")? = Some(child);
    Ok(node_status())
}

#[tauri::command]
fn stop_local_node(runtime: State<NodeRuntime>) -> Result<NodeStatus, String> {
    if let Some(mut child) = runtime.0.lock().map_err(|_| "Node runtime lock poisoned")?.take() {
        let _ = child.kill(); let _ = child.wait();
    }
    Ok(node_status())
}

#[tauri::command]
fn vault_home() -> String {
    dirs_home().join(".cervel/vaults").to_string_lossy().to_string()
}

fn dirs_home() -> PathBuf {
    std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."))
}

#[tauri::command]
fn register_browser_bridge(app: AppHandle) -> Result<String, String> {
    let root = repo_root();
    let script = root.join("dist/scripts/browser-alpha-dev-installer.js");
    if !script.exists() { return Err("Browser bridge installer is not built.".into()); }
    Command::new("node").arg(script).arg("--browser").arg("chrome")
        .env("CERVEL_DESKTOP_MANAGED", "1").spawn().map_err(|e| e.to_string())?;
    let _ = app.emit("browser-bridge:registration-started", ());
    Ok("Browser bridge registration started".into())
}

pub fn run() {
    tauri::Builder::default()
        .manage(NodeRuntime(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![node_status, start_local_node, stop_local_node, vault_home, register_browser_bridge])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            let open = MenuItem::with_id(app, "open", "Open CERVEL", true, None::<&str>)?;
            let node = MenuItem::with_id(app, "node", "Start Local Node", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &node, &quit])?;
            let _tray = TrayIconBuilder::new().menu(&menu).tooltip("CERVEL — Persistent Knowledge Infrastructure")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => { if let Some(w) = app.get_webview_window("main") { let _=w.show(); let _=w.set_focus(); } },
                    "node" => { let runtime=app.state::<NodeRuntime>(); let _=start_local_node(runtime); },
                    "quit" => app.exit(0), _ => {}
                })
                .on_tray_icon_event(|tray, event| if let TrayIconEvent::Click { .. } = event { if let Some(w)=tray.app_handle().get_webview_window("main") { let _=w.show(); let _=w.set_focus(); } })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running CERVEL desktop");
}
