# Floatie — Product Requirements Document v3.0
**Status:** Final  
**Stack:** Electron + Svelte 5 + TypeScript + UnoCSS + electron-vite  
**Perubahan dari v2:** React 19 → Svelte 5 · Tailwind v4 → UnoCSS · semua contoh kode diperbarui

---

## 1. Ringkasan

Floatie adalah floating mini browser always-on-top untuk menonton YouTube Shorts, TikTok, dan Reels sambil bekerja. Bukan browser umum — hanya untuk sosial media, super ringan, selalu di atas semua aplikasi termasuk fullscreen Mac.

---

## 2. Non-Goals

- Bukan browser umum (tidak ada tab, bookmark, history, download)
- Tidak ada sinkronisasi real-time dengan Chrome yang sedang berjalan
- Tidak ada cookie import via decryption (sqlite3 + keytar)
- Tidak support Firefox
- Tidak ada login/akun Floatie sendiri

---

## 3. Mengapa Svelte 5 + UnoCSS

| | React 19 + Tailwind v4 | **Svelte 5 + UnoCSS** |
|--|--|--|
| JS runtime di bundle | ~45KB (react + react-dom) | **~0KB** (dikompilasi ke vanilla JS) |
| Startup renderer | ~300–500ms parse + hydrate | **~80–120ms** |
| Virtual DOM | Ya | **Tidak — surgical DOM update** |
| Config file styling | tailwind.config.ts + PostCSS | **uno.config.ts saja, no PostCSS** |
| Template electron-vite | `--template react-ts` | **`--template svelte-ts`** |
| Runes / state model | `useState`, `useEffect` | **`$state`, `$effect`, `$derived`** |

---

## 4. Tech Stack

```
Runtime          : Electron 33+
Build tooling    : electron-vite 3+
UI framework     : Svelte 5 (svelte@5.37+)
Language         : TypeScript 5.6+
Styling          : UnoCSS (presetWind3 + shortcuts)
Adblock          : @cliqz/adblocker-electron
Storage          : electron-store 10+
Packaging        : electron-builder 25+
```

### Setup Awal (satu perintah)

```bash
npm create electron-vite@latest mobile-float -- --template svelte-ts
cd mobile-float
npm install
npm install @cliqz/adblocker-electron electron-store electron-fetch
npm install -D unocss
```

---

## 5. Struktur File

```
mobile-float/
├── src/
│   ├── main/
│   │   ├── index.ts             ← main process: window, IPC, lifecycle
│   │   ├── adblocker.ts         ← @cliqz/adblocker-electron
│   │   ├── bridge.ts            ← deteksi Chrome/Edge/Brave profile (Sprint 3)
│   │   └── extension-loader.ts  ← load extensions ke session
│   ├── preload/
│   │   └── index.ts             ← contextBridge, expose window.mf
│   └── renderer/
│       ├── index.html           ← <html class="dark"> selalu dark
│       ├── main.ts              ← mount App, import 'virtual:uno.css'
│       ├── App.svelte           ← root layout
│       └── components/
│           ├── Toolbar.svelte
│           ├── QuickLinks.svelte
│           ├── WebviewContainer.svelte
│           ├── AutoScrollPanel.svelte   ← Sprint 2
│           └── ExtensionPanel.svelte    ← Sprint 3
├── scroll-inject.js             ← diinjeksi ke webview (vanilla JS, bukan TS)
├── uno.config.ts
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Konfigurasi UnoCSS

### uno.config.ts

```typescript
import {
  defineConfig,
  presetWind3,
  presetIcons,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),   // Tailwind v3-compatible utilities
    presetIcons({    // CSS icons — opsional untuk ikon SVG
      scale: 1.2,
      warn: true,
    }),
  ],

  transformers: [
    transformerVariantGroup(),  // grup: hover:(bg-x text-y)
  ],

  // ── Design tokens Floatie ─────────────────────────
  theme: {
    colors: {
      mf: {
        bg:      '#0a0a0a',
        surface: '#141414',
        sur2:    '#1e1e1e',
        bdr:     '#282828',
        bdr2:    '#363636',
        text:    '#efefef',
        muted:   '#888888',
        hint:    '#4a4a4a',
        accent:  '#e63946',
        pin:     '#f4a261',
        adblock: '#2dc653',
        dark:    '#457b9d',
        ext:     '#6366f1',
      },
    },
    fontFamily: {
      sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['ui-monospace', 'Cascadia Code', 'monospace'],
    },
  },

  // ── Shortcuts = komponen class yang reusable ──────────
  shortcuts: {
    // Tombol standar toolbar
    'tb-btn':
      'w-7 h-7 flex items-center justify-center rounded-[6px] ' +
      'bg-mf-sur2 border border-mf-bdr text-mf-muted text-[13px] ' +
      'hover:(bg-[#252525] border-mf-bdr2 text-mf-text) ' +
      'transition-all duration-100 cursor-pointer select-none',

    // State aktif per fungsi
    'tb-btn--pin':     'border-mf-pin text-mf-pin bg-mf-pin/10',
    'tb-btn--adblock': 'border-mf-adblock text-mf-adblock bg-mf-adblock/10',
    'tb-btn--dark':    'border-mf-dark text-mf-dark bg-mf-dark/10',
    'tb-btn--ext':     'border-mf-ext text-mf-ext bg-mf-ext/10',

    // Traffic lights (macOS)
    'traffic-dot':
      'w-[11px] h-[11px] rounded-full border-none cursor-pointer ' +
      'transition-filter duration-150 hover:brightness-125',

    // Quick link pill
    'ql-pill':
      'px-[9px] py-[3px] rounded-[20px] text-[10.5px] font-medium ' +
      'bg-mf-sur2 border border-mf-bdr text-mf-muted ' +
      'hover:text-mf-text transition-all duration-100 cursor-pointer whitespace-nowrap',
    'ql-pill--active': 'border-mf-accent text-mf-accent bg-mf-accent/10',

    // Panel collapsible base
    'panel-base':
      'bg-mf-surface border-b border-mf-bdr overflow-hidden ' +
      'transition-[max-height] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
  },
})
```

### electron.vite.config.ts — tambahkan UnoCSS ke renderer

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte }   from '@sveltejs/vite-plugin-svelte'
import UnoCSS       from 'unocss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [
      UnoCSS(),    // ← UnoCSS sebelum Svelte
      svelte(),
    ],
  },
})
```

### renderer/main.ts

```typescript
import 'virtual:uno.css'          // ← wajib, inject generated CSS
import App from './App.svelte'
import { mount } from 'svelte'

mount(App, { target: document.getElementById('app')! })
```

### renderer/index.html

```html
<!DOCTYPE html>
<html lang="id" class="dark">   <!-- class="dark" → selalu dark mode -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Floatie</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/renderer/main.ts"></script>
</body>
</html>
```

---

## 7. Main Process (src/main/index.ts)

```typescript
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { initAdblock, toggleAdblock } from './adblocker'
import { loadSavedExtensions } from './extension-loader'

interface StoreSchema {
  windowBounds : { x?: number; y?: number; width: number; height: number }
  isPinned     : boolean
  opacity      : number
  adblockEnabled: boolean
  lastUrl      : string
  autoScroll   : {
    mode           : 'off' | 'smart' | 'timer'
    delayMs        : number
    loopsBeforeNext: number
    timerSeconds   : number
  }
  extensionPaths: string[]
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds : { width: 390, height: 780 },
    isPinned     : true,
    opacity      : 1.0,
    adblockEnabled: true,
    lastUrl      : 'https://www.youtube.com/shorts/',
    autoScroll   : { mode: 'off', delayMs: 500, loopsBeforeNext: 1, timerSeconds: 30 },
    extensionPaths: [],
  },
})

let mainWindow: BrowserWindow

function createWindow() {
  const bounds = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth : 320,
    minHeight: 500,
    maxWidth : 480,
    frame    : false,
    resizable: true,
    hasShadow: true,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload         : join(__dirname, '../preload/index.js'),
      nodeIntegration : false,
      contextIsolation: true,
      webviewTag      : true,
      sandbox         : false,
    },
  })

  // ── WAJIB DUA BARIS INI BERSAMA ───────────────────────
  // setAlwaysOnTop saja tidak cukup untuk Mac fullscreen swipe
  mainWindow.setAlwaysOnTop(store.get('isPinned'), 'floating')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setOpacity(store.get('opacity'))
  // ──────────────────────────────────────────────────────

  mainWindow.on('resize', () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.on('move',   () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── Startup sequence ─────────────────────────────────────
app.whenReady().then(async () => {
  await initAdblock()                  // 1. adblock sebelum window
  await loadSavedExtensions(store)     // 2. extensions sebelum window
  createWindow()                       // 3. baru buat window
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
}
```

---

## 8. Adblock (src/main/adblocker.ts)

```typescript
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import { session } from 'electron'
import fetch from 'electron-fetch'

let blocker: ElectronBlocker | null = null

const MF_SESSION = () => session.fromPartition('persist:floatie')

export async function initAdblock() {
  blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch as any)
  blocker.enableBlockingInSession(MF_SESSION())
}

export function toggleAdblock(enabled: boolean) {
  if (!blocker) return
  if (enabled) blocker.enableBlockingInSession(MF_SESSION())
  else blocker.disableBlockingInSession(MF_SESSION())
}
```

---

## 9. Extension Loader (src/main/extension-loader.ts)

```typescript
import { session } from 'electron'
import { existsSync } from 'fs'
import type Store from 'electron-store'

export async function loadSavedExtensions(store: Store<any>) {
  const paths: string[] = store.get('extensionPaths', [])
  if (!paths.length) return

  const ses = session.fromPartition('persist:floatie')
  const valid = paths.filter(p => existsSync(p))

  // Paralel, tidak block startup
  const results = await Promise.allSettled(
    valid.map(p => ses.loadExtension(p, { allowFileAccess: true }))
  )

  results.forEach((r, i) => {
    if (r.status === 'rejected')
      console.warn('[MF] Skip extension:', valid[i], r.reason?.message)
  })

  // Bersihkan path yang tidak valid
  if (valid.length !== paths.length) store.set('extensionPaths', valid)
}
```

---

## 10. Preload (src/preload/index.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const mf = {
  // Window
  setAlwaysOnTop : (v: boolean)  => ipcRenderer.invoke('win:setAlwaysOnTop', v),
  setOpacity     : (v: number)   => ipcRenderer.invoke('win:setOpacity', v),
  close          : ()            => ipcRenderer.invoke('win:close'),
  minimize       : ()            => ipcRenderer.invoke('win:minimize'),

  // Adblock
  toggleAdblock  : (v: boolean)  => ipcRenderer.invoke('adblock:toggle', v),

  // Store
  getStore       : (k: string)   => ipcRenderer.invoke('store:get', k),
  setStore       : (k: string, v: unknown) => ipcRenderer.invoke('store:set', k, v),

  // Extensions (Sprint 3)
  extList        : ()            => ipcRenderer.invoke('ext:list'),
  extAdd         : ()            => ipcRenderer.invoke('ext:add'),
  extRemove      : (id: string)  => ipcRenderer.invoke('ext:remove', id),
  extDetectBrowsers: ()          => ipcRenderer.invoke('ext:detectBrowsers'),
  extGetProfiles : (p: string)   => ipcRenderer.invoke('ext:getProfiles', p),
  extListFromProfile: (p: string)=> ipcRenderer.invoke('ext:listFromProfile', p),
  extLoadSelected: (paths: string[]) => ipcRenderer.invoke('ext:loadSelected', paths),

  platform: process.platform as NodeJS.Platform,
} as const

contextBridge.exposeInMainWorld('mf', mf)

// Type augmentation untuk renderer TypeScript
export type MfAPI = typeof mf
```

---

## 11. Scroll Fix (scroll-inject.js)

File ini vanilla JS — bukan TypeScript — karena diinjeksi langsung ke webview.

```javascript
;(function () {
  if (window.__mfScrollFixed) return
  window.__mfScrollFixed = true

  const THROTTLE = 600
  let lastScrollTime = 0

  // ── Site detection ─────────────────────────────────────
  function tactic() {
    const h = location.hostname
    if (h.includes('youtube'))   return 'keyboard'
    if (h.includes('tiktok'))    return 'touch'
    if (h.includes('instagram')) return 'touch'
    if (h.includes('facebook'))  return 'touch'
    if (h.includes('threads'))   return 'touch'
    return 'touch'
  }

  // ── Keyboard navigation (YouTube Shorts) ───────────────
  function fireKey(key) {
    ;['keydown', 'keyup'].forEach(t =>
      document.dispatchEvent(new KeyboardEvent(t, { key, code: key, bubbles: true, cancelable: true }))
    )
  }

  // ── Touch swipe simulation (TikTok, IG, FB, dll) ───────
  function swipe(dir) {
    const cx = innerWidth / 2, cy = innerHeight / 2
    const d  = innerHeight * 0.45
    const sy = dir === 'next' ? cy + d / 2 : cy - d / 2
    const ey = dir === 'next' ? cy - d / 2 : cy + d / 2
    const mk = (y) => new Touch({
      identifier: Date.now(), target: document.body,
      clientX: cx, clientY: y, screenX: cx, screenY: y,
      pageX: cx, pageY: y, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1,
    })
    const opts = (touches) => ({ bubbles: true, cancelable: true, view: window, touches, changedTouches: touches })

    document.dispatchEvent(new TouchEvent('touchstart', opts([mk(sy)])))
    let step = 0
    const id = setInterval(() => {
      step++
      const y = sy + (ey - sy) * (step / 12)
      document.dispatchEvent(new TouchEvent('touchmove', opts([mk(y)])))
      if (step >= 12) {
        clearInterval(id)
        document.dispatchEvent(new TouchEvent('touchend', { ...opts([]), changedTouches: [mk(ey)] }))
      }
    }, 14)
  }

  // ── Public API (dipakai juga oleh auto-scroll Sprint 2) ─
  window.__mfScrollNext = () => tactic() === 'keyboard' ? fireKey('ArrowDown') : swipe('next')
  window.__mfScrollPrev = () => tactic() === 'keyboard' ? fireKey('ArrowUp')   : swipe('prev')

  // ── Manual wheel ────────────────────────────────────────
  window.addEventListener('wheel', (e) => {
    e.preventDefault()
    const now = Date.now()
    if (now - lastScrollTime < THROTTLE) return
    lastScrollTime = now
    if (e.deltaY > 0) window.__mfScrollNext()
    else window.__mfScrollPrev()
  }, { passive: false, capture: true })

  // ── Auto-scroll: video end detection (aktif jika __mfAutoScrollEnabled) ─
  let loopCount = 0, lastVTime = 0, scrollCooldown = false

  function scheduleNext() {
    if (scrollCooldown) return
    scrollCooldown = true
    setTimeout(() => {
      scrollCooldown = false
      window.__mfScrollNext?.()
    }, window.__mfScrollDelay ?? 500)
  }

  document.addEventListener('ended', (e) => {
    if (!window.__mfAutoScrollEnabled) return
    if (e.target?.tagName !== 'VIDEO') return
    scheduleNext()
  }, true)

  document.addEventListener('timeupdate', (e) => {
    if (!window.__mfAutoScrollEnabled) return
    if (e.target?.tagName !== 'VIDEO') return
    const v = e.target
    if (!v.duration) return
    const wasEnd   = lastVTime > v.duration * 0.88
    const isStart  = v.currentTime < 1.0
    if (wasEnd && isStart) {
      loopCount++
      if (loopCount >= (window.__mfLoopsBeforeScroll ?? 1)) {
        loopCount = 0
        scheduleNext()
      }
    }
    lastVTime = v.currentTime
  }, true)

})()
```

Di `WebviewContainer.svelte`, inject script ini:

```javascript
import { readFileSync } from 'fs'
import { join } from 'path'

// Di main process, pass lewat IPC atau baca langsung di renderer dengan fs
// Cara paling simpel: embed sebagai string di main process, kirim via IPC saat window ready
// ATAU: gunakan preload untuk expose path dan baca di renderer
```

Alternatif yang lebih praktis — embed sebagai module:

```typescript
// src/renderer/scroll-inject-str.ts
// Vite akan inline isi file ini sebagai string saat build
const src = await fetch(new URL('../../scroll-inject.js', import.meta.url)).then(r => r.text())
export default src
```

---

## 12. Svelte 5 Components

### App.svelte

```svelte
<script lang="ts">
  import Toolbar           from './components/Toolbar.svelte'
  import QuickLinks        from './components/QuickLinks.svelte'
  import WebviewContainer  from './components/WebviewContainer.svelte'
  import AutoScrollPanel   from './components/AutoScrollPanel.svelte'

  let webviewRef = $state<Electron.WebviewTag | null>(null)
  let currentUrl = $state('https://www.youtube.com/shorts/')
  let loadingWidth = $state(0)
  let loadingVisible = $state(false)

  // Loading bar
  function onLoadStart() { loadingWidth = 40; loadingVisible = true }
  function onLoadEnd()   {
    loadingWidth = 100
    setTimeout(() => { loadingVisible = false; loadingWidth = 0 }, 500)
  }
</script>

<div class="flex flex-col h-screen overflow-hidden rounded-xl
            border border-mf-bdr bg-mf-bg text-mf-text select-none">

  <Toolbar bind:webview={webviewRef} bind:currentUrl />
  <QuickLinks {currentUrl} onNavigate={(url) => webviewRef?.loadURL(url)} />
  <AutoScrollPanel bind:webview={webviewRef} />

  <!-- Loading bar -->
  <div
    class="h-[2px] bg-mf-accent flex-shrink-0 transition-all duration-200"
    style:width="{loadingWidth}%"
    style:opacity={loadingVisible ? '1' : '0'}
  ></div>

  <WebviewContainer
    bind:ref={webviewRef}
    bind:currentUrl
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
  />
</div>
```

### Toolbar.svelte

```svelte
<script lang="ts">
  let {
    webview = $bindable<Electron.WebviewTag | null>(null),
    currentUrl = $bindable(''),
  }: { webview: Electron.WebviewTag | null; currentUrl: string } = $props()

  let isPinned      = $state(true)
  let adblockOn     = $state(true)
  let darkOn        = $state(false)
  let opacity       = $state(100)
  let urlInput      = $state('')
  let canBack       = $state(false)
  let canForward    = $state(false)
  let isLoading     = $state(false)
  let isMac         = window.mf.platform === 'darwin'

  // Restore dari store
  $effect(() => {
    window.mf.getStore('isPinned').then((v: boolean) => isPinned = v)
    window.mf.getStore('adblockEnabled').then((v: boolean) => adblockOn = v)
    window.mf.getStore('opacity').then((v: number) => opacity = Math.round(v * 100))
  })

  // Sinkron URL bar dengan navigasi
  $effect(() => { urlInput = currentUrl })

  // Update nav state saat webview berubah
  $effect(() => {
    if (!webview) return
    const onNav = () => {
      canBack    = webview!.canGoBack()
      canForward = webview!.canGoForward()
    }
    webview.addEventListener('did-navigate', onNav)
    webview.addEventListener('did-navigate-in-page', onNav)
    webview.addEventListener('did-start-loading', () => isLoading = true)
    webview.addEventListener('did-stop-loading',  () => { isLoading = false; onNav() })
    return () => {
      webview!.removeEventListener('did-navigate', onNav)
      webview!.removeEventListener('did-navigate-in-page', onNav)
    }
  })

  function navigate(raw: string) {
    let url = raw.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = url.includes('.') && !url.includes(' ')
        ? 'https://' + url
        : 'https://www.google.com/search?q=' + encodeURIComponent(url)
    }
    webview?.loadURL(url)
  }

  async function togglePin() {
    isPinned = !isPinned
    await window.mf.setAlwaysOnTop(isPinned)
  }

  async function toggleAdblock() {
    adblockOn = !adblockOn
    await window.mf.toggleAdblock(adblockOn)
  }

  function onOpacityInput(e: Event) {
    opacity = +(e.target as HTMLInputElement).value
    window.mf.setOpacity(opacity / 100)
    window.mf.setStore('opacity', opacity / 100)
  }
</script>

<div
  class="bg-mf-surface border-b border-mf-bdr flex-shrink-0 px-[10px] pt-[8px] pb-[6px]"
  style="-webkit-app-region: drag"
>
  <!-- Baris 1 -->
  <div class="flex items-center gap-[5px]" style="-webkit-app-region: no-drag">

    <!-- Traffic lights (Mac) / close+min (Windows) -->
    {#if isMac}
      <button class="traffic-dot bg-[#ff5f57]" onclick={() => window.mf.close()}   aria-label="Close"></button>
      <button class="traffic-dot bg-[#febc2e]" onclick={() => window.mf.minimize()} aria-label="Minimize"></button>
    {/if}

    <!-- Nav -->
    <button
      class="tb-btn"
      style:opacity={canBack ? '1' : '0.35'}
      onclick={() => webview?.goBack()}
      aria-label="Back"
    >←</button>
    <button
      class="tb-btn"
      style:opacity={canForward ? '1' : '0.35'}
      onclick={() => webview?.goForward()}
      aria-label="Forward"
    >→</button>
    <button
      class="tb-btn"
      onclick={() => isLoading ? webview?.stop() : webview?.reload()}
      aria-label={isLoading ? 'Stop' : 'Refresh'}
    >{isLoading ? '✕' : '⟳'}</button>

    <!-- URL bar -->
    <input
      class="flex-1 h-7 bg-mf-sur2 border border-mf-bdr rounded-[6px]
             text-mf-text font-mono text-[11px] px-[10px]
             focus:outline-none focus:border-mf-bdr2"
      type="text"
      bind:value={urlInput}
      onkeydown={(e) => e.key === 'Enter' && navigate(urlInput)}
      placeholder="Ketik URL atau cari…"
      spellcheck={false}
    />

    <!-- Opacity -->
    <span class="text-[10px] text-mf-muted font-mono min-w-[28px] text-right">{opacity}%</span>
    <input
      class="w-[52px] accent-mf-accent"
      type="range" min="40" max="100" step="5"
      value={opacity}
      oninput={onOpacityInput}
      aria-label="Opacity"
    />

    <!-- Adblock toggle -->
    <button
      class="tb-btn"
      class:tb-btn--adblock={adblockOn}
      onclick={toggleAdblock}
      title={adblockOn ? 'Adblock aktif' : 'Adblock nonaktif'}
      aria-label="Toggle adblock"
    >🛡</button>

    <!-- Pin toggle -->
    <button
      class="tb-btn"
      class:tb-btn--pin={isPinned}
      onclick={togglePin}
      title={isPinned ? 'Pinned' : 'Unpinned'}
      aria-label="Toggle always on top"
    >📌</button>

    <!-- Windows close/min -->
    {#if !isMac}
      <button class="tb-btn ml-1" onclick={() => window.mf.minimize()} aria-label="Minimize">─</button>
      <button class="tb-btn" onclick={() => window.mf.close()} aria-label="Close">✕</button>
    {/if}
  </div>
</div>
```

### QuickLinks.svelte

```svelte
<script lang="ts">
  let {
    currentUrl = '',
    onNavigate,
  }: { currentUrl: string; onNavigate: (url: string) => void } = $props()

  const LINKS = [
    { label: '▶ Shorts',  url: 'https://www.youtube.com/shorts/'  },
    { label: '♪ TikTok',  url: 'https://www.tiktok.com/'          },
    { label: '👍 FB',     url: 'https://m.facebook.com/reels/'    },
    { label: '📸 IG',     url: 'https://www.instagram.com/reels/' },
    { label: '𝕏 X',       url: 'https://x.com/home'               },
    { label: '@ Threads', url: 'https://www.threads.net/'          },
  ]

  function isActive(linkUrl: string) {
    try {
      const base = new URL(linkUrl).hostname.replace(/^(www\.|m\.)/, '')
      const curr = new URL(currentUrl).hostname.replace(/^(www\.|m\.)/, '')
      return curr.includes(base)
    } catch { return false }
  }
</script>

<div
  class="flex gap-1 px-[10px] pb-[6px] overflow-x-auto [scrollbar-width:none] bg-mf-surface"
  style="-webkit-app-region: no-drag"
>
  {#each LINKS as link}
    <button
      class="ql-pill"
      class:ql-pill--active={isActive(link.url)}
      onclick={() => onNavigate(link.url)}
    >
      {link.label}
    </button>
  {/each}
</div>
```

### WebviewContainer.svelte

```svelte
<script lang="ts">
  import scrollInjectSrc from '../scroll-inject-str'   // string dari scroll-inject.js

  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
             'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
             'Version/17.5 Mobile/15E148 Safari/604.1'

  let {
    ref = $bindable<Electron.WebviewTag | null>(null),
    currentUrl = $bindable(''),
    onLoadStart,
    onLoadEnd,
  }: {
    ref        : Electron.WebviewTag | null
    currentUrl : string
    onLoadStart: () => void
    onLoadEnd  : () => void
  } = $props()

  // Inject scroll fix setiap kali navigasi
  function injectScrollFix() {
    ref?.executeJavaScript(scrollInjectSrc).catch(() => {})
  }

  $effect(() => {
    if (!ref) return

    ref.addEventListener('dom-ready',             injectScrollFix)
    ref.addEventListener('did-navigate',          injectScrollFix)
    ref.addEventListener('did-navigate-in-page',  injectScrollFix)

    ref.addEventListener('did-navigate',         (e: any) => currentUrl = e.url)
    ref.addEventListener('did-navigate-in-page', (e: any) => currentUrl = e.url)
    ref.addEventListener('did-start-loading',    onLoadStart)
    ref.addEventListener('did-stop-loading',     onLoadEnd)

    ref.addEventListener('page-title-updated', (e: any) => {
      document.title = e.title ? `${e.title} — Floatie` : 'Floatie'
    })
  })
</script>

<div class="flex-1 overflow-hidden" style="contain: strict">
  <!-- svelte-ignore a11y_missing_attribute -->
  <webview
    bind:this={ref}
    class="w-full h-full border-none"
    src={currentUrl}
    useragent={UA}
    partition="persist:floatie"
    allowpopups
  ></webview>
</div>
```

---

## 13. Scroll Inject sebagai String Module

```typescript
// src/renderer/scroll-inject-str.ts
// Vite membaca file sebagai raw string dengan query ?raw
// @ts-ignore
import src from '../../scroll-inject.js?raw'
export default src as string
```

---

## 14. State yang Disimpan (electron-store)

```typescript
{
  windowBounds   : { x?, y?, width: 390, height: 780 },
  isPinned       : true,
  opacity        : 1.0,
  adblockEnabled : true,
  lastUrl        : 'https://www.youtube.com/shorts/',
  autoScroll: {
    mode           : 'off',    // 'smart' | 'timer' | 'off'
    delayMs        : 500,
    loopsBeforeNext: 1,
    timerSeconds   : 30,
  },
  extensionPaths : [],
}
```

---

## 15. Packaging

```json
{
  "build": {
    "appId"      : "com.floatie.app",
    "productName": "Floatie",
    "files"      : ["dist/**/*"],
    "mac": {
      "category": "public.app-category.utilities",
      "target"  : [
        { "target": "dmg", "arch": ["arm64", "x64"] },
        { "target": "zip", "arch": ["arm64", "x64"] }
      ]
    },
    "win": {
      "target": [
        { "target": "nsis",     "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ]
    }
  }
}
```

### Scripts (package.json)

```json
{
  "scripts": {
    "dev"      : "electron-vite dev",
    "build"    : "electron-vite build",
    "preview"  : "electron-vite preview",
    "build:mac": "npm run build && electron-builder --mac",
    "build:win": "npm run build && electron-builder --win"
  }
}
```

---

## 16. Roadmap

### Sprint 1 — Core
- [ ] Setup: electron-vite svelte-ts + UnoCSS + uno.config.ts
- [ ] main/index.ts: window + `setVisibleOnAllWorkspaces`
- [ ] adblocker.ts + extension-loader.ts
- [ ] preload/index.ts
- [ ] scroll-inject.js
- [ ] App.svelte + Toolbar.svelte + QuickLinks.svelte + WebviewContainer.svelte
- [ ] State persistence
- [ ] Build Mac + Windows

### Sprint 2 — Auto-Scroll + Polish
- [ ] AutoScrollPanel.svelte (smart + timer mode)
- [ ] Dark mode CSS injection toggle
- [ ] Keyboard shortcuts (Cmd+R, Cmd+L, Cmd+[, Cmd+])
- [ ] Responsive toolbar via ResizeObserver

### Sprint 3 — Extension Manager
- [ ] ExtensionPanel.svelte (manual add + import dari Chrome/Edge/Brave)
- [ ] bridge.ts: deteksi browser, baca profil, list extensions
- [ ] IPC: ext:list, ext:add, ext:remove, ext:detectBrowsers, ext:loadSelected

---

## 17. Catatan Penting

1. `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` wajib bersama `setAlwaysOnTop(true, 'floating')` — tanpa ini window menghilang saat swipe ke fullscreen app di Mac.

2. `scroll-inject.js` dibaca sebagai raw string oleh Vite (`?raw` query) — tidak perlu kompilasi atau bundling terpisah.

3. `sandbox: false` diperlukan di `webPreferences` agar `webviewTag: true` berfungsi di Electron terbaru.

4. Seluruh extension dimuat **sebelum** `createWindow()` agar aktif saat webview pertama kali dibuka.

5. UnoCSS `shortcuts` menggantikan Tailwind `@apply` — lebih efisien karena langsung di-resolve saat build tanpa PostCSS.

6. Svelte 5 Runes (`$state`, `$effect`, `$derived`, `$props`) adalah API baru — jangan campur dengan sintaks Svelte 4 (`$:`, `export let`).