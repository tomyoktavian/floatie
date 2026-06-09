<script lang="ts">
  import AutoScrollPanel from './AutoScrollPanel.svelte'
  import { uaFor } from '../ua'

  let {
    webview      = $bindable<Electron.WebviewTag | null>(null),
    currentUrl   = $bindable(''),
    extPanelOpen = $bindable(false),
    onHide,
  }: {
    webview      : Electron.WebviewTag | null
    currentUrl   : string
    extPanelOpen : boolean
    onHide      ?: () => void
  } = $props()

  let isPinned   = $state(true)
  let adblockOn  = $state(true)
  let darkOn     = $state(false)
  let hideCtrl   = $state(true)
  let opacity    = $state(100)
  let volume     = $state(100)
  let urlInput   = $state('')
  let canBack    = $state(false)
  let canForward = $state(false)
  let isLoading  = $state(false)
  let menuOpen   = $state(false)
  const isMac    = window.mf.platform === 'darwin'

  // Restore from store
  $effect(() => {
    window.mf.getStore('isPinned').then((v) => isPinned = v as boolean)
    window.mf.getStore('adblockEnabled').then((v) => adblockOn = v as boolean)
    window.mf.getStore('opacity').then((v) => opacity = Math.round((v as number) * 100))
    window.mf.getStore('hideControls').then((v) => { hideCtrl = v !== false; pushHideCtrl() })
    window.mf.getStore('volume').then((v) => { volume = Math.round((v as number ?? 1) * 100); pushVolume() })
  })

  // Push page-side prefs (re-applied on every navigation, since they reset on reload).
  function pushHideCtrl() {
    webview?.executeJavaScript(
      hideCtrl
        ? 'window.__mfAutoHideControls = true'
        : 'window.__mfAutoHideControls = false; document.documentElement.classList.remove("mf-hide-ui")'
    ).catch(() => {})
  }
  function pushVolume() {
    webview?.executeJavaScript(`window.__mfVolume = ${volume / 100}; window.__mfSetVolume?.(${volume / 100})`).catch(() => {})
  }
  function pushPrefs() { pushHideCtrl(); pushVolume() }

  function toggleHideCtrl() {
    hideCtrl = !hideCtrl
    pushHideCtrl()
    window.mf.setStore('hideControls', hideCtrl)
  }

  function onVolumeInput(e: Event) {
    volume = +(e.target as HTMLInputElement).value
    pushVolume()
    window.mf.setStore('volume', volume / 100)
  }

  // Sync URL bar with navigation
  $effect(() => { urlInput = currentUrl })

  // Update nav state when webview changes
  $effect(() => {
    if (!webview) return
    const onNav = () => {
      canBack    = webview!.canGoBack()
      canForward = webview!.canGoForward()
    }
    webview.addEventListener('did-navigate',         onNav)
    webview.addEventListener('did-navigate-in-page', onNav)
    webview.addEventListener('did-start-loading',    () => isLoading = true)
    webview.addEventListener('did-stop-loading',     () => { isLoading = false; onNav() })
    webview.addEventListener('dom-ready',            pushPrefs)
    return () => {
      webview!.removeEventListener('did-navigate',         onNav)
      webview!.removeEventListener('did-navigate-in-page', onNav)
      webview!.removeEventListener('dom-ready',            pushPrefs)
    }
  })

  // Keyboard shortcut: Cmd+L focus URL bar (Sprint 2)
  let urlInputEl: HTMLInputElement | null = $state(null)
  $effect(() => {
    const handler = () => { urlInputEl?.focus(); urlInputEl?.select() }
    document.addEventListener('mf:focusUrl', handler)
    return () => document.removeEventListener('mf:focusUrl', handler)
  })

  // Close the menu on Escape
  $effect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') menuOpen = false }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function navigate(raw: string) {
    let url = raw.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = url.includes('.') && !url.includes(' ')
        ? 'https://' + url
        : 'https://www.google.com/search?q=' + encodeURIComponent(url)
    }
    webview?.loadURL(url, { userAgent: uaFor(url) })
  }

  async function togglePin() {
    isPinned = !isPinned
    await window.mf.setAlwaysOnTop(isPinned)
  }

  async function toggleAdblock() {
    adblockOn = !adblockOn
    await window.mf.toggleAdblock(adblockOn)
  }

  function toggleDark() {
    darkOn = !darkOn
    const script = darkOn
      ? `(function(){let s=document.getElementById('__mf_dark');if(!s){s=document.createElement('style');s.id='__mf_dark';s.textContent='html{filter:invert(1) hue-rotate(180deg)!important}img,video,canvas,picture,iframe{filter:invert(1) hue-rotate(180deg)!important}';document.head.appendChild(s)}})()`
      : `(function(){document.getElementById('__mf_dark')?.remove()})()`
    webview?.executeJavaScript(script).catch(() => {})
  }

  function onOpacityInput(e: Event) {
    opacity = +(e.target as HTMLInputElement).value
    window.mf.setOpacity(opacity / 100)
    window.mf.setStore('opacity', opacity / 100)
  }

  function getFaviconUrl(url: string) {
    try { return `${new URL(url).origin}/favicon.ico` } catch { return '' }
  }
</script>

<!-- Toolbar wrapper — draggable -->
<div class="toolbar-root" style="-webkit-app-region: drag">
  <div
    class="toolbar-inner"
    class:toolbar-inner--mac={isMac}
    class:toolbar-inner--win={!isMac}
    style="-webkit-app-region: no-drag"
  >
    <!-- ── Nav buttons ─────────────────────────────── -->
    <div class="btn-group">
      <button class="nav-btn" disabled={!canBack} onclick={() => webview?.goBack()} aria-label="Back" title="Back (Cmd+[)">
        <span class="i-lucide-chevron-left btn-icon"></span>
      </button>
      <button class="nav-btn" disabled={!canForward} onclick={() => webview?.goForward()} aria-label="Forward" title="Forward (Cmd+])">
        <span class="i-lucide-chevron-right btn-icon"></span>
      </button>
    </div>

    <!-- ── URL bar ─────────────────────────────────── -->
    <div class="url-bar-wrap">
      {#if currentUrl}
        <img class="url-favicon" src={getFaviconUrl(currentUrl)} alt="" onerror={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
      {:else}
        <span class="i-lucide-globe url-favicon-icon"></span>
      {/if}
      <input
        bind:this={urlInputEl}
        class="url-input"
        type="text"
        bind:value={urlInput}
        onkeydown={(e) => e.key === 'Enter' && navigate(urlInput)}
        onfocus={() => { urlInputEl?.select() }}
        placeholder="Search or enter URL…"
        spellcheck={false}
        autocomplete="off"
      />
    </div>

    <!-- ── Overflow (3-dot) menu ───────────────────── -->
    <button
      class="nav-btn"
      class:nav-btn--active={menuOpen}
      onclick={() => menuOpen = !menuOpen}
      aria-label="Menu"
      title="More"
    >
      <span class="i-lucide-more-vertical btn-icon"></span>
    </button>

    <!-- ── Hide toolbar ────────────────────────────── -->
    <button class="nav-btn" onclick={() => onHide?.()} aria-label="Hide toolbar" title="Sembunyikan toolbar">
      <span class="i-lucide-chevron-up btn-icon"></span>
    </button>
  </div>

  <!-- Menu is kept mounted (display-toggled) so AutoScrollPanel's engine
       keeps running even while the menu is closed. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="menu-backdrop" class:open={menuOpen} style="-webkit-app-region: no-drag" onclick={() => menuOpen = false}></div>

  <div class="menu-pop" class:open={menuOpen} style="-webkit-app-region: no-drag">
      <!-- Reload / stop -->
      <button class="menu-row" onclick={() => { isLoading ? webview?.stop() : webview?.reload(); menuOpen = false }}>
        <span class="{isLoading ? 'i-lucide-x' : 'i-lucide-rotate-cw'} menu-row-icon" style="color:#aaa"></span>
        <span class="menu-row-label">{isLoading ? 'Stop' : 'Reload'}</span>
        <span class="menu-key">{isMac ? '⌘R' : 'Ctrl R'}</span>
      </button>

      <div class="menu-sep"></div>

      <!-- Auto-scroll section -->
      <AutoScrollPanel bind:webview />

      <div class="menu-sep"></div>

      <!-- Toggle rows -->
      <button class="menu-row" onclick={toggleAdblock}>
        <span class="i-lucide-shield menu-row-icon" style:color={adblockOn ? '#2dc653' : '#666'}></span>
        <span class="menu-row-label">Ad block</span>
        <span class="menu-badge" class:on={adblockOn}>{adblockOn ? 'On' : 'Off'}</span>
      </button>
      <button class="menu-row" onclick={toggleDark}>
        <span class="i-lucide-moon menu-row-icon" style:color={darkOn ? '#457b9d' : '#666'}></span>
        <span class="menu-row-label">Dark mode</span>
        <span class="menu-badge" class:on={darkOn}>{darkOn ? 'On' : 'Off'}</span>
      </button>
      <button class="menu-row" onclick={toggleHideCtrl} title="Sembunyikan tombol situs saat idle, muncul saat gerakkan mouse">
        <span class="i-lucide-eye-off menu-row-icon" style:color={hideCtrl ? '#9b8cff' : '#666'}></span>
        <span class="menu-row-label">Hide controls</span>
        <span class="menu-badge" class:on={hideCtrl}>{hideCtrl ? 'On' : 'Off'}</span>
      </button>
      <button class="menu-row" onclick={togglePin}>
        <span class="i-lucide-pin menu-row-icon" style:color={isPinned ? '#f4a261' : '#666'}></span>
        <span class="menu-row-label">Always on top</span>
        <span class="menu-badge" class:on={isPinned}>{isPinned ? 'On' : 'Off'}</span>
      </button>
      <button class="menu-row" onclick={() => { extPanelOpen = !extPanelOpen; menuOpen = false }}>
        <span class="i-lucide-puzzle menu-row-icon" style:color={extPanelOpen ? '#6366f1' : '#666'}></span>
        <span class="menu-row-label">Extensions</span>
        <span class="i-lucide-chevron-right menu-row-chev"></span>
      </button>

      <div class="menu-sep"></div>

      <!-- Volume (this app only) -->
      <div class="menu-row menu-row--slider">
        <span class="{volume === 0 ? 'i-lucide-volume-x' : 'i-lucide-volume-2'} menu-row-icon"></span>
        <span class="menu-row-label">Volume</span>
        <input class="menu-slider" type="range" min="0" max="100" step="5" value={volume} oninput={onVolumeInput} aria-label="Volume" />
        <span class="menu-val">{volume}%</span>
      </div>

      <!-- Opacity -->
      <div class="menu-row menu-row--slider">
        <span class="i-lucide-blend menu-row-icon"></span>
        <span class="menu-row-label">Opacity</span>
        <input class="menu-slider" type="range" min="40" max="100" step="5" value={opacity} oninput={onOpacityInput} aria-label="Opacity" />
        <span class="menu-val">{opacity}%</span>
      </div>
  </div>
</div>

<style>
  .toolbar-root {
    position: relative;
    background: #141414;
    border-bottom: 1px solid #282828;
    flex-shrink: 0;
    padding: 7px 10px 6px;
  }

  .toolbar-inner {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .toolbar-inner--mac { padding-left: 72px; }
  .toolbar-inner--win { padding-right: 140px; }

  .btn-group {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .btn-icon { display: block; width: 15px; height: 15px; color: inherit; }

  /* ── Nav / icon buttons ─────────────────────── */
  .nav-btn {
    width: 28px; height: 28px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: #888;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0; padding: 0;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .nav-btn:hover:not(:disabled) { background: #1e1e1e; border-color: #303030; color: #e0e0e0; }
  .nav-btn:active:not(:disabled) { background: #252525; }
  .nav-btn:disabled { opacity: 0.3; cursor: default; }
  .nav-btn--active { background: #1e1e1e; border-color: #303030; color: #e0e0e0; }

  /* ── URL bar ────────────────────────────────── */
  .url-bar-wrap {
    flex: 1; min-width: 0; height: 28px;
    display: flex; align-items: center; gap: 6px;
    background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 7px;
    padding: 0 10px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .url-bar-wrap:focus-within { border-color: #444; box-shadow: 0 0 0 2px rgba(100,100,100,0.15); }
  .url-favicon { width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0; object-fit: contain; }
  .url-favicon-icon { width: 14px; height: 14px; color: #444; flex-shrink: 0; }
  .url-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: #d0d0d0; font: 11px/1 ui-monospace, 'Cascadia Code', 'SF Mono', monospace;
    min-width: 0; caret-color: #e63946;
  }
  .url-input::placeholder { color: #3a3a3a; }

  /* ── Dropdown menu ──────────────────────────── */
  .menu-backdrop {
    position: fixed; inset: 0; z-index: 40;
    display: none;
  }
  .menu-backdrop.open { display: block; }

  .menu-pop {
    position: absolute;
    top: calc(100% - 2px);
    right: 8px;
    z-index: 50;
    width: 230px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
    padding: 6px;
    flex-direction: column;
    gap: 1px;
    display: none;
  }
  .menu-pop.open {
    display: flex;
    animation: menu-in 0.12s ease;
  }
  @keyframes menu-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .menu-sep { height: 1px; background: #2a2a2a; margin: 5px 2px; }

  .menu-row {
    display: flex; align-items: center; gap: 9px;
    width: 100%;
    padding: 7px 8px;
    border: none; background: transparent;
    border-radius: 6px;
    color: #ccc;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }
  .menu-row:hover { background: #242424; }
  .menu-row--slider { cursor: default; }
  .menu-row--slider:hover { background: transparent; }

  .menu-row-icon { width: 15px; height: 15px; flex-shrink: 0; color: #888; }
  .menu-row-label { flex: 1; white-space: nowrap; }
  .menu-row-chev { width: 14px; height: 14px; color: #555; flex-shrink: 0; }

  .menu-badge {
    font-size: 9.5px; font-weight: 600;
    padding: 1px 7px; border-radius: 20px;
    background: #2a2a2a; color: #777;
    flex-shrink: 0;
  }
  .menu-badge.on { background: rgba(45, 198, 83, 0.14); color: #2dc653; }

  .menu-key {
    font-size: 9.5px;
    color: #555;
    font-family: ui-monospace, monospace;
    flex-shrink: 0;
  }

  .menu-slider { width: 80px; accent-color: #e63946; cursor: pointer; flex-shrink: 0; }
  .menu-val {
    font-size: 10px; color: #666; font-family: ui-monospace, monospace;
    min-width: 30px; text-align: right; flex-shrink: 0;
  }
</style>
