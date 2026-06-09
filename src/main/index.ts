import { app, BrowserWindow, ipcMain, session, dialog, webContents } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const isDev = process.env['NODE_ENV'] === 'development' || !!process.env['ELECTRON_RENDERER_URL']
import { initAdblock, toggleAdblock } from './adblocker'
import { loadSavedExtensions } from './extension-loader'
import { detectBrowsers, getProfiles, listExtensionsFromProfile } from './bridge'

// Let videos start playing with sound without requiring a user gesture.
// Must be set before app is ready.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const GUEST_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// Default UA for any webContents that doesn't set its own (e.g. login pop-ups).
// Presents as real mobile Safari (no "Electron" token) so Meta/etc. don't reject
// OAuth flows. The feed webview overrides this via its own `useragent` attribute.
app.userAgentFallback = GUEST_UA

// Login flows (incl. "Log in with Facebook") open in the SAME webview like a
// normal browser tab — instead of a separate pop-up. Meta's OAuth pop-up is
// flaky in embedded browsers ("This page isn't available"); the full-page
// redirect flow in one window is far more reliable, and it stays in the same
// session (persist:floatie) so the login sticks.
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return
  contents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:/i.test(url)) contents.loadURL(url).catch(() => {})
    return { action: 'deny' }
  })
})

interface StoreSchema {
  windowBounds : { x?: number; y?: number; width: number; height: number }
  isPinned     : boolean
  opacity      : number
  volume       : number
  adblockEnabled: boolean
  lastUrl      : string
  autoScroll   : {
    mode        : 'off' | 'smart' | 'timer'
    delayMs     : number
    timerSeconds: number
  }
  extensionPaths: string[]
  hideControls : boolean
  toolbarHidden: boolean
  customLinks  : { label: string; url: string }[]
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds : { width: 390, height: 780 },
    isPinned     : true,
    opacity      : 1.0,
    volume       : 1.0,
    adblockEnabled: true,
    lastUrl      : 'https://www.youtube.com/shorts/',
    autoScroll   : { mode: 'smart', delayMs: 300, timerSeconds: 30 },
    extensionPaths: [],
    hideControls : true,
    toolbarHidden: false,
    customLinks  : [],
  },
})

let mainWindow: BrowserWindow

function createWindow() {
  const bounds = store.get('windowBounds')

  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth : 180,
    minHeight: 130,
    maxWidth : 480,
    resizable: true,
    hasShadow: true,
    backgroundColor: '#0a0a0a',
    // Native OS window controls: hidden title bar on macOS keeps real traffic
    // lights; Windows uses a frameless window with native overlay controls.
    ...(isMac
      ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 13, y: 13 } }
      : { frame: false, titleBarStyle: 'hidden' as const,
          titleBarOverlay: { color: '#141414', symbolColor: '#cccccc', height: 42 } }),
    webPreferences: {
      preload         : join(__dirname, '../preload/index.mjs'),
      nodeIntegration : false,
      contextIsolation: true,
      webviewTag      : true,
      sandbox         : false,
    },
  })

  // WAJIB DUA BARIS INI BERSAMA — setAlwaysOnTop saja tidak cukup untuk Mac fullscreen swipe
  mainWindow.setAlwaysOnTop(store.get('isPinned'), 'floating')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setOpacity(store.get('opacity'))

  mainWindow.on('resize', () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.on('move',   () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Startup sequence ─────────────────────────────────────
app.whenReady().then(async () => {
  await initAdblock()
  await loadSavedExtensions(store)
  createWindow()
  setupIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC ──────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('win:setAlwaysOnTop', (_, v: boolean) => {
    mainWindow.setAlwaysOnTop(v, 'floating')
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    store.set('isPinned', v)
  })
  ipcMain.handle('win:setOpacity',  (_, v: number)  => { mainWindow.setOpacity(v); store.set('opacity', v) })
  ipcMain.handle('win:close',       ()              => mainWindow.close())
  ipcMain.handle('win:minimize',    ()              => mainWindow.minimize())
  ipcMain.handle('adblock:toggle',  (_, v: boolean) => { toggleAdblock(v); store.set('adblockEnabled', v) })
  ipcMain.handle('store:get',       (_, k: string)  => store.get(k as keyof StoreSchema))
  ipcMain.handle('store:set',       (_, k: string, v: unknown) => store.set(k as keyof StoreSchema, v as any))

  // Trusted touch-swipe on the guest feed (YouTube/TikTok ignore synthetic events).
  // Used as the fallback when the in-page container can't be scrolled.
  ipcMain.handle('mf:scrollGesture', async (_, dir: number, w: number, h: number) => {
    const guest = webContents.getAllWebContents().find(c => c.getType() === 'webview')
    if (!guest) return
    try { if (!guest.debugger.isAttached()) guest.debugger.attach('1.3') } catch { /* already */ }
    const x = Math.max(10, Math.floor((w || 390) / 2))
    const y = Math.max(10, Math.floor((h || 600) / 2))
    const dist = Math.floor((h || 600) * 0.9)
    try {
      await guest.debugger.sendCommand('Input.synthesizeScrollGesture', {
        x, y, xDistance: 0, yDistance: dir > 0 ? -dist : dist,
        speed: 1000, gestureSourceType: 'touch',
      })
    } catch { /* gesture failed */ }
  })

  // ── Extension IPC (Sprint 3) ──────────────────────────
  ipcMain.handle('ext:list', () => {
    const ses = session.fromPartition('persist:floatie')
    return ses.getAllExtensions().map((e: any) => ({ id: e.id, name: e.name, path: e.path }))
  })

  ipcMain.handle('ext:add', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Extension Directory',
      properties: ['openDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return
    const path = result.filePaths[0]
    const ses  = session.fromPartition('persist:floatie')
    await ses.loadExtension(path, { allowFileAccess: true })
    const paths: string[] = store.get('extensionPaths')
    if (!paths.includes(path)) store.set('extensionPaths', [...paths, path])
  })

  ipcMain.handle('ext:remove', (_, id: string) => {
    const ses  = session.fromPartition('persist:floatie')
    const ext  = ses.getAllExtensions().find((e: any) => e.id === id) as any
    ses.removeExtension(id)
    if (ext?.path) {
      const paths: string[] = store.get('extensionPaths')
      store.set('extensionPaths', paths.filter(p => p !== ext.path))
    }
  })

  ipcMain.handle('ext:detectBrowsers',   ()               => detectBrowsers())
  ipcMain.handle('ext:getProfiles',      (_, p: string)   => getProfiles(p))
  ipcMain.handle('ext:listFromProfile',  (_, p: string)   => listExtensionsFromProfile(p))

  ipcMain.handle('ext:loadSelected', async (_, paths: string[]) => {
    const ses = session.fromPartition('persist:floatie')
    await Promise.allSettled(paths.map(p => ses.loadExtension(p, { allowFileAccess: true })))
    const stored: string[] = store.get('extensionPaths')
    store.set('extensionPaths', [...new Set([...stored, ...paths])])
  })
}
