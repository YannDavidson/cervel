use serde::Serialize;
use std::{net::TcpStream, path::{Path, PathBuf}, process::{Command, Stdio}, sync::Mutex, time::Duration};
use tauri::{AppHandle, Emitter, Manager, State};

const NODE_PORT: u16 = 8787;

#[derive(Default)]
struct RuntimeState { active_vault: Option<PathBuf> }
struct NodeRuntime(Mutex<RuntimeState>);

#[derive(Clone, Serialize)]
struct NodeStatus { running: bool, endpoint: String, managed_by_desktop: bool, vault: Option<String> }

fn repo_root() -> PathBuf {
    std::env::var("CERVEL_APP_ROOT").map(PathBuf::from).unwrap_or_else(|_| std::env::current_dir().unwrap_or_default())
}
fn dirs_home() -> PathBuf {
    std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."))
}
fn is_node_running() -> bool {
    TcpStream::connect_timeout(&format!("127.0.0.1:{NODE_PORT}").parse().unwrap(), Duration::from_millis(250)).is_ok()
}
fn status_for(runtime: &NodeRuntime) -> NodeStatus {
    let vault = runtime.0.lock().ok().and_then(|state| state.active_vault.as_ref().map(|p| p.to_string_lossy().to_string()));
    NodeStatus { running: is_node_running(), endpoint: format!("http://127.0.0.1:{NODE_PORT}"), managed_by_desktop: true, vault }
}
fn cli_path() -> PathBuf { repo_root().join("dist/apps/local-node/src/cli.js") }
fn validate_vault(path: &Path) -> Result<(), String> {
    if !path.join("vault.json").is_file() { return Err("Select a CERVEL Vault containing vault.json.".into()); }
    Ok(())
}
fn run_cli(command: &str, vault: &Path, passphrase: Option<&str>) -> Result<(), String> {
    let cli = cli_path();
    if !cli.exists() { return Err("Local Node build not found. Run npm run build first.".into()); }
    let mut process=Command::new("node");
    process.arg(cli).arg(command).arg("--vault").arg(vault).arg("--port").arg(NODE_PORT.to_string()).stdin(Stdio::null());
    if let Some(secret)=passphrase { process.env("CERVEL_VAULT_PASSPHRASE",secret); }
    let output=process.output().map_err(|e| format!("Unable to run CERVEL Local Node: {e}"))?;
    if !output.status.success() {
        let message=String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if message.is_empty(){format!("cervel {command} failed") } else { message });
    }
    Ok(())
}

#[tauri::command]
fn node_status(runtime: State<NodeRuntime>) -> NodeStatus { status_for(&runtime) }

#[tauri::command]
fn start_local_node(runtime: State<NodeRuntime>, vault_path: String, passphrase: String) -> Result<NodeStatus, String> {
    if passphrase.len() < 12 { return Err("Vault passphrase must be at least 12 characters.".into()); }
    let vault=PathBuf::from(vault_path);
    validate_vault(&vault)?;
    if !is_node_running() { run_cli("start", &vault, Some(&passphrase))?; }
    runtime.0.lock().map_err(|_| "Node runtime lock poisoned")?.active_vault=Some(vault);
    Ok(status_for(&runtime))
}

#[tauri::command]
fn stop_local_node(runtime: State<NodeRuntime>) -> Result<NodeStatus, String> {
    let vault=runtime.0.lock().map_err(|_| "Node runtime lock poisoned")?.active_vault.clone();
    if let Some(vault)=vault { if is_node_running() { run_cli("lock", &vault, None)?; } }
    Ok(status_for(&runtime))
}

#[tauri::command]
fn vault_home() -> String { dirs_home().join(".cervel/vaults").to_string_lossy().to_string() }

#[tauri::command]
fn register_browser_bridge(app: AppHandle, passphrase: String) -> Result<String, String> {
    if passphrase.len() < 12 { return Err("Vault passphrase must be at least 12 characters.".into()); }
    let script = repo_root().join("dist/scripts/browser-alpha-dev-installer.js");
    if !script.exists() { return Err("Browser bridge installer is not built.".into()); }
    let state=app.state::<NodeRuntime>();
    let vault=state.0.lock().map_err(|_| "Node runtime lock poisoned")?.active_vault.clone().ok_or("Unlock a Vault before registering the Browser bridge.")?;
    Command::new("node").arg(script).arg("--browser").arg("chrome").arg("--vault").arg(vault).arg("--no-node")
        .env("CERVEL_VAULT_PASSPHRASE", passphrase).env("CERVEL_DESKTOP_MANAGED", "1")
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|e| e.to_string())?;
    let _ = app.emit("browser-bridge:registration-started", ());
    Ok("Browser bridge registration started".into())
}

pub fn run() {
    tauri::Builder::default()
        .manage(NodeRuntime(Mutex::new(RuntimeState::default())))
        .invoke_handler(tauri::generate_handler![node_status, start_local_node, stop_local_node, vault_home, register_browser_bridge])
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{TrayIconBuilder, TrayIconEvent};
            let open = MenuItem::with_id(app, "open", "Open CERVEL", true, None::<&str>)?;
            let status = MenuItem::with_id(app, "status", "Local Node status", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &status, &quit])?;
            let _tray = TrayIconBuilder::new().menu(&menu).tooltip("CERVEL — Persistent Knowledge Infrastructure")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => { if let Some(w) = app.get_webview_window("main") { let _=w.show(); let _=w.set_focus(); } },
                    "status" => { let state=app.state::<NodeRuntime>(); let _=app.emit("node:status", status_for(&state)); },
                    "quit" => app.exit(0), _ => {}
                })
                .on_tray_icon_event(|tray, event| if let TrayIconEvent::Click { .. } = event { if let Some(w)=tray.app_handle().get_webview_window("main") { let _=w.show(); let _=w.set_focus(); } })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running CERVEL desktop");
}
