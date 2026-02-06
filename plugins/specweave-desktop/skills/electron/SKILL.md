---
description: "Desktop application development with Electron and Tauri. Covers cross-platform native apps, IPC communication, security hardening, packaging, auto-updates, native APIs, and performance optimization. Activates for: Electron, Tauri, desktop app, native app, cross-platform desktop, BrowserWindow, IPC, system tray, menubar app, auto-updater, code signing, notarization."
model: opus
context: fork
---

# Desktop Application Development (Electron & Tauri)

Expert guidance for building production-grade cross-platform desktop applications using Electron and Tauri. This skill covers architecture, security, native integration, packaging, and distribution.

## Decision Framework: Electron vs Tauri vs PWA

Before writing code, choose the right platform:

| Factor | Electron | Tauri 2.0 | PWA |
|--------|----------|-----------|-----|
| Bundle size | 150-300MB | 2-10MB | 0 (web) |
| Memory usage | High (Chromium) | Low (OS webview) | Varies |
| Native API access | Extensive | Growing (plugin-based) | Limited |
| Language | JS/TS (main + renderer) | Rust (backend) + JS/TS (frontend) | JS/TS |
| Maturity | Very mature | Stable (v2 released) | Mature |
| Auto-updates | Built-in ecosystem | Built-in (v2) | Automatic |
| Offline support | Full | Full | Service Worker |
| App store distribution | Yes | Yes | Limited |
| Team expertise needed | JavaScript | JavaScript + Rust | JavaScript |

### When to Choose Each

**Choose Electron when:**
- Team is JavaScript-only and cannot invest in Rust
- You need deep native OS integration (accessibility APIs, COM on Windows)
- Extensive third-party native module ecosystem is required
- You are building a complex IDE-like application (VS Code model)

**Choose Tauri when:**
- Bundle size and memory footprint matter (user-facing consumer apps)
- Security is a top priority (minimal attack surface)
- You want Rust performance for backend operations
- You are building a lightweight utility or tool

**Choose PWA when:**
- No native OS integration needed beyond notifications and offline
- Distribution through app stores is not required
- Maximum reach across all platforms including mobile
- Minimal installation friction is the priority

## Electron Architecture

### Process Model

Electron uses a multi-process architecture inspired by Chromium:

```
+------------------+     IPC      +-------------------+
|   Main Process   | <----------> | Renderer Process  |
|   (Node.js)      |              | (Chromium)        |
|                  |              |                   |
| - App lifecycle  |              | - UI rendering    |
| - Native APIs   |              | - Web APIs        |
| - Window mgmt   |              | - DOM manipulation|
| - System tray   |              | - preload scripts |
| - File system   |              |                   |
+------------------+              +-------------------+
        |                                  |
        v                                  v
+------------------+              +-------------------+
| Utility Process  |              | Renderer Process  |
| (CPU-intensive)  |              | (additional window)|
+------------------+              +-------------------+
```

### Main Process Setup

```typescript
// main.ts - Entry point for the main process
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeTheme } from 'electron';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // SECURITY: Always enable context isolation
      contextIsolation: true,
      // SECURITY: Never enable node integration in renderer
      nodeIntegration: false,
      // SECURITY: Enable sandbox for renderer
      sandbox: true,
      // Preload script bridges main and renderer
      preload: path.join(__dirname, 'preload.js'),
    },
    // Platform-specific window chrome
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 10 },
    show: false, // Prevent flash of white
  });

  // Graceful show after content loads
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

### IPC Communication (Secure Pattern)

IPC is the backbone of Electron apps. Always use the preload bridge pattern:

```typescript
// preload.ts - Runs in renderer context with Node.js access
import { contextBridge, ipcRenderer } from 'electron';

// SECURITY: Only expose specific channels, never expose ipcRenderer directly
contextBridge.exposeInMainWorld('electronAPI', {
  // One-way: renderer -> main
  setTitle: (title: string) => ipcRenderer.send('set-title', title),

  // Two-way: renderer -> main -> renderer (invoke/handle pattern)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content: string) => ipcRenderer.invoke('dialog:saveFile', content),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Main -> renderer (events)
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const subscription = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', subscription);
    // Return cleanup function
    return () => ipcRenderer.removeListener('update-available', subscription);
  },

  onDeepLink: (callback: (url: string) => void) => {
    const subscription = (_event: IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('deep-link', subscription);
    return () => ipcRenderer.removeListener('deep-link', subscription);
  },
});

// Type declaration for renderer process
export interface ElectronAPI {
  setTitle: (title: string) => void;
  openFile: () => Promise<string | null>;
  saveFile: (content: string) => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onDeepLink: (callback: (url: string) => void) => () => void;
}
```

```typescript
// main.ts - IPC handlers
import { ipcMain, dialog, BrowserWindow } from 'electron';

// Handle invoke calls from renderer
ipcMain.handle('dialog:openFile', async (event) => {
  // SECURITY: Validate the sender
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (!win) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['txt', 'md', 'json'] },
    ],
  });

  return canceled ? null : filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (event, content: string) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (!win) return false;

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    filters: [{ name: 'Text', extensions: ['txt'] }],
  });

  if (canceled || !filePath) return false;

  const fs = await import('node:fs/promises');
  await fs.writeFile(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('app:getVersion', () => app.getVersion());
```

### Multi-Window Management

```typescript
// window-manager.ts
import { BrowserWindow, screen } from 'electron';

class WindowManager {
  private windows = new Map<string, BrowserWindow>();

  create(id: string, options: Partial<Electron.BrowserWindowConstructorOptions> = {}): BrowserWindow {
    if (this.windows.has(id)) {
      const existing = this.windows.get(id)!;
      existing.focus();
      return existing;
    }

    const parentBounds = BrowserWindow.getFocusedWindow()?.getBounds();
    const display = screen.getPrimaryDisplay();

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      // Cascade new windows
      x: parentBounds ? parentBounds.x + 30 : undefined,
      y: parentBounds ? parentBounds.y + 30 : undefined,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      ...options,
    });

    this.windows.set(id, win);

    win.on('closed', () => {
      this.windows.delete(id);
    });

    return win;
  }

  get(id: string): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  closeAll(): void {
    for (const [id, win] of this.windows) {
      win.close();
    }
  }
}

export const windowManager = new WindowManager();
```

### Security Best Practices

Security is the most critical aspect of Electron development:

```typescript
// Content Security Policy - set in main process
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self';",
        "script-src 'self';",
        "style-src 'self' 'unsafe-inline';",  // Required for many UI frameworks
        "img-src 'self' data: https:;",
        "connect-src 'self' https://api.yourapp.com;",
        "font-src 'self';",
      ].join(' '),
    },
  });
});

// SECURITY: Prevent new window creation (phishing vector)
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  // Open external links in the default browser
  if (url.startsWith('https://')) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});

// SECURITY: Prevent navigation away from the app
mainWindow.webContents.on('will-navigate', (event, url) => {
  const appUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : `file://${__dirname}`;

  if (!url.startsWith(appUrl)) {
    event.preventDefault();
  }
});
```

### Security Checklist

1. `contextIsolation: true` -- always
2. `nodeIntegration: false` -- always
3. `sandbox: true` -- always unless native modules require otherwise
4. Never expose `ipcRenderer` directly via contextBridge
5. Validate all IPC message senders
6. Set Content Security Policy headers
7. Prevent navigation and new window creation
8. Use `safeStorage` for sensitive data (tokens, credentials)
9. Validate file paths to prevent path traversal
10. Keep Electron updated (security patches in Chromium)

### Native APIs

```typescript
// System tray
import { Tray, Menu, nativeImage } from 'electron';

function createTray(): Tray {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '../assets/tray-icon.png')
  );
  // macOS: template images for dark/light mode
  icon.setTemplateImage(true);

  const tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow?.show() },
    { label: 'Preferences...', click: () => openPreferences() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('My Desktop App');
  tray.setContextMenu(contextMenu);

  // macOS: click to toggle window
  tray.on('click', () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show();
  });

  return tray;
}

// Notifications
import { Notification } from 'electron';

function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;

  new Notification({
    title,
    body,
    icon: path.join(__dirname, '../assets/icon.png'),
    silent: false,
  }).show();
}
```

### Auto-Updates with electron-updater

```typescript
// auto-updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    // Notify renderer
    const win = BrowserWindow.getFocusedWindow();
    win?.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = BrowserWindow.getFocusedWindow();
    win?.webContents.send('update-progress', progress.percent);
    // Update taskbar progress (Windows)
    win?.setProgressBar(progress.percent / 100);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded, will install on quit');
    const win = BrowserWindow.getFocusedWindow();
    win?.webContents.send('update-ready');
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(log.error);
  }, 4 * 60 * 60 * 1000);

  // Initial check after 10 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(log.error);
  }, 10_000);
}
```

### Performance Optimization

```typescript
// Lazy load heavy modules
async function processLargeFile(filePath: string): Promise<void> {
  // Use utility process for CPU-intensive work
  const { utilityProcess } = await import('electron');
  const child = utilityProcess.fork(path.join(__dirname, 'workers/file-processor.js'));

  child.postMessage({ type: 'process', filePath });

  return new Promise((resolve, reject) => {
    child.on('message', (msg) => {
      if (msg.type === 'done') resolve();
      if (msg.type === 'error') reject(new Error(msg.message));
    });
  });
}

// Memory management
function monitorMemory(): void {
  setInterval(() => {
    const usage = process.memoryUsage();
    const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
    if (heapMB > 500) {
      // Trigger garbage collection hint
      if (global.gc) global.gc();
      log.warn(`High memory usage: ${heapMB}MB`);
    }
  }, 30_000);
}
```

### Testing Electron Apps

```typescript
// Using Playwright for Electron testing
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { test, expect } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '../dist/main.js')],
    env: { ...process.env, NODE_ENV: 'test' },
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
});

test('app window title', async () => {
  const title = await page.title();
  expect(title).toBe('My App');
});

test('IPC communication works', async () => {
  const version = await app.evaluate(async ({ app }) => {
    return app.getVersion();
  });
  expect(version).toMatch(/\d+\.\d+\.\d+/);
});
```

### Packaging with Electron Forge

```json
// forge.config.ts
{
  "packagerConfig": {
    "asar": true,
    "icon": "./assets/icon",
    "appBundleId": "com.yourcompany.yourapp",
    "osxSign": {},
    "osxNotarize": {
      "appleId": "APPLE_ID",
      "appleIdPassword": "APPLE_APP_PASSWORD",
      "teamId": "TEAM_ID"
    }
  },
  "makers": [
    { "name": "@electron-forge/maker-squirrel" },
    { "name": "@electron-forge/maker-dmg" },
    { "name": "@electron-forge/maker-deb" },
    { "name": "@electron-forge/maker-rpm" }
  ],
  "publishers": [
    {
      "name": "@electron-forge/publisher-github",
      "config": {
        "repository": { "owner": "your-org", "name": "your-app" },
        "prerelease": false
      }
    }
  ]
}
```

---

## Tauri 2.0 Architecture

Tauri uses the OS native webview instead of bundling Chromium, resulting in drastically smaller binaries.

### Project Structure

```
src-tauri/
  src/
    main.rs          # Entry point
    lib.rs           # Command definitions
    commands/        # Command modules
  tauri.conf.json    # Tauri configuration
  Cargo.toml         # Rust dependencies
  capabilities/      # Permission capabilities
src/                 # Frontend (any framework)
  App.tsx
  main.tsx
```

### Tauri Commands (Rust Backend)

```rust
// src-tauri/src/lib.rs
use tauri::Manager;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize)]
struct FileInfo {
    name: String,
    size: u64,
    modified: String,
}

// Commands are invoked from JavaScript
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            size: metadata.len(),
            modified: format!("{:?}", metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)),
        });
    }

    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            list_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Tauri Frontend Integration

```typescript
// Invoking Tauri commands from JavaScript/TypeScript
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

// Call custom Rust commands
async function loadFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Text', extensions: ['txt', 'md'] }],
  });

  if (!selected) return null;

  // Use custom command
  return await invoke<string>('read_file', { path: selected });
}

// Tauri events (bidirectional)
import { listen } from '@tauri-apps/api/event';

// Listen for events from Rust backend
const unlisten = await listen<string>('file-changed', (event) => {
  console.log('File changed:', event.payload);
});

// Clean up listener
unlisten();
```

### Tauri Security Model (Capabilities)

Tauri 2.0 uses a capability-based permission system:

```json
// src-tauri/capabilities/main.json
{
  "identifier": "main-capability",
  "description": "Main window permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:scope-app-data",
    "shell:allow-open",
    "updater:default"
  ]
}
```

---

## Common Desktop Patterns

### Offline-First Architecture

```typescript
// Sync engine pattern for offline-first desktop apps
interface SyncState {
  lastSynced: Date | null;
  pendingChanges: Change[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
}

class OfflineSyncEngine {
  private db: LocalDatabase;
  private state: SyncState;

  async saveLocally(data: Record<string, unknown>): Promise<void> {
    await this.db.put(data);
    this.state.pendingChanges.push({
      type: 'upsert',
      data,
      timestamp: new Date(),
    });
    // Attempt sync if online
    if (navigator.onLine) {
      this.sync().catch(() => { /* queued for later */ });
    }
  }

  async sync(): Promise<void> {
    if (this.state.syncStatus === 'syncing') return;
    this.state.syncStatus = 'syncing';

    try {
      const changes = [...this.state.pendingChanges];
      await this.pushChanges(changes);
      const remote = await this.pullChanges(this.state.lastSynced);
      await this.mergeChanges(remote);
      this.state.pendingChanges = this.state.pendingChanges.slice(changes.length);
      this.state.lastSynced = new Date();
      this.state.syncStatus = 'idle';
    } catch {
      this.state.syncStatus = 'error';
    }
  }
}
```

### Cross-Platform Considerations

| Concern | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Window chrome | `titleBarStyle: 'hiddenInset'` | Custom title bar or default | Default |
| Tray icon | Template image (16x16) | ICO (16x16, 32x32) | PNG (22x22) |
| Menu | App menu in menu bar | Window menu bar | Window menu bar |
| Shortcuts | Cmd+key | Ctrl+key | Ctrl+key |
| File paths | `/Users/name/...` | `C:\Users\name\...` | `/home/name/...` |
| App data | `~/Library/Application Support/` | `%APPDATA%` | `~/.config/` |
| Auto-start | Login Items API | Registry / Startup folder | Desktop autostart |

### Distribution Checklist

- [ ] Code sign the application (Apple Developer ID / Windows Authenticode)
- [ ] Notarize for macOS (required for distribution outside App Store)
- [ ] Set up auto-update server (GitHub Releases or custom)
- [ ] Create installers: DMG (macOS), NSIS/Squirrel (Windows), AppImage/deb/rpm (Linux)
- [ ] Test on all target platforms before release
- [ ] Set up crash reporting (Sentry, Crashpad)
- [ ] Implement telemetry with user consent
- [ ] Add deep link / protocol handler registration
- [ ] Test auto-update flow end-to-end on each platform
