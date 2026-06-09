<script lang="ts">
  import Toolbar          from './components/Toolbar.svelte'
  import QuickLinks       from './components/QuickLinks.svelte'
  import WebviewContainer from './components/WebviewContainer.svelte'
  import VideoControls    from './components/VideoControls.svelte'
  import ExtensionPanel   from './components/ExtensionPanel.svelte'

  let webviewRef     = $state<Electron.WebviewTag | null>(null)
  let currentUrl     = $state('')
  let loadingWidth   = $state(0)
  let loadingVisible = $state(false)
  let extPanelOpen   = $state(false)

  // Toolbar is hidden/shown by an explicit button click (no hover).
  let toolbarHidden = $state(false)
  $effect(() => {
    window.mf.getStore('toolbarHidden').then((v) => { toolbarHidden = v === true })
  })
  function setToolbarHidden(v: boolean) {
    toolbarHidden = v
    window.mf.setStore('toolbarHidden', v)
  }

  const isMac = window.mf.platform === 'darwin'

  // "Desktop site" (mobile by default; needed only to log into Meta). Lives here
  // so the login caution banner can react to it.
  let desktopMode = $state(false)
  function setDesktop(on: boolean) {
    desktopMode = on
    window.mf.setDesktop(on)   // main swaps the feed UA + reloads
  }

  // Show a caution on Meta login / Accounts Center pages while desktop is off —
  // Meta's login breaks on the mobile/embedded path.
  const META_RE = /(?:^|\.)(?:facebook\.com|instagram\.com|threads\.net|threads\.com)$/i
  const AUTH_RE = /accountscenter|\/login|\/accounts\/login|\/oauth|\/dialog|\/checkpoint|\/challenge|two_factor/i
  function isMetaLogin(url: string): boolean {
    try { const u = new URL(url); return META_RE.test(u.hostname) && AUTH_RE.test(u.hostname + u.pathname) }
    catch { return false }
  }
  // IG/Threads show their login form at the site root (in-page), so URL alone
  // isn't enough — also detect a password field on the page.
  let hasLoginForm = $state(false)
  let loginCaution = $derived(!desktopMode && (hasLoginForm || isMetaLogin(currentUrl)))

  $effect(() => {
    const wv = webviewRef
    if (!wv) return
    const check = async () => {
      try {
        if (!META_RE.test(new URL(currentUrl).hostname)) { hasLoginForm = false; return }
        hasLoginForm = await wv.executeJavaScript('!!document.querySelector("input[type=password]")')
      } catch { hasLoginForm = false }
    }
    wv.addEventListener('did-stop-loading', check)
    wv.addEventListener('did-navigate-in-page', check)
    return () => {
      wv.removeEventListener('did-stop-loading', check)
      wv.removeEventListener('did-navigate-in-page', check)
    }
  })

  function onLoadStart() { loadingWidth = 60; loadingVisible = true }
  function onLoadEnd()   {
    loadingWidth = 100
    setTimeout(() => { loadingVisible = false; loadingWidth = 0 }, 400)
  }

  // Keyboard shortcuts
  $effect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        const delta = e.key === 'ArrowLeft' ? -5 : 5
        webviewRef?.executeJavaScript(`window.__mfVideoSeek?.(${delta})`).catch(() => {})
        return
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        const fn = e.key === 'ArrowDown' ? '__mfScrollNext' : '__mfScrollPrev'
        webviewRef?.executeJavaScript(`window.${fn}?.()`).catch(() => {})
        return
      }
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key === 'r') { e.preventDefault(); webviewRef?.reload() }
      if (e.key === '[') { e.preventDefault(); webviewRef?.goBack() }
      if (e.key === ']') { e.preventDefault(); webviewRef?.goForward() }
      if (e.key === 'l') { e.preventDefault(); document.dispatchEvent(new CustomEvent('mf:focusUrl')) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })
</script>

<div class="app-root">
  <!-- ── Top chrome (toggle with the hide button) ───────── -->
  <div class="top-chrome" class:collapsed={toolbarHidden}>
    <Toolbar bind:webview={webviewRef} bind:currentUrl bind:extPanelOpen {desktopMode} onToggleDesktop={() => setDesktop(!desktopMode)} onHide={() => setToolbarHidden(true)} />
    <QuickLinks {currentUrl} onNavigate={(url) => webviewRef?.loadURL(url)} />
    <div class="loading-bar" style:width="{loadingWidth}%" style:opacity={loadingVisible ? '1' : '0'}></div>
  </div>

  <!-- Reveal tab — only when the toolbar is hidden; click to bring it back -->
  {#if toolbarHidden}
    <button class="reveal-tab" onclick={() => setToolbarHidden(false)} title="Tampilkan toolbar" aria-label="Show toolbar">
      <span class="i-lucide-chevron-down reveal-icon"></span>
    </button>
  {/if}

  <ExtensionPanel bind:open={extPanelOpen} />

  <!-- Login caution: Meta login needs the desktop site -->
  {#if loginCaution}
    <div class="login-caution">
      <span class="i-lucide-info caution-icon"></span>
      <span class="caution-text">Untuk login FB, aktifkan <b>Desktop site</b> dulu.</span>
      <button class="caution-btn" onclick={() => setDesktop(true)}>Aktifkan</button>
    </div>
  {/if}

  <!-- video fills the middle -->
  <WebviewContainer
    bind:ref={webviewRef}
    bind:currentUrl
    initialUrl="https://www.youtube.com/shorts/?gl=ID&hl=id&persist_gl=1&persist_hl=1"
    onLoadStart={onLoadStart}
    onLoadEnd={onLoadEnd}
  />

  <!-- bottom controls stay visible -->
  <VideoControls bind:webview={webviewRef} />
</div>

<style>
  .app-root {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid #282828;
    background: #0a0a0a;
    color: #efefef;
    user-select: none;
  }

  /* collapsible top bar — collapses its height, never overlays the video */
  .top-chrome {
    position: relative;
    z-index: 20;            /* stack above the webview so dropdowns sit on top */
    flex-shrink: 0;
    max-height: 120px;
    overflow: hidden;
    transition: max-height 0.22s ease, opacity 0.18s ease;
  }
  .top-chrome.collapsed {
    max-height: 0;
    opacity: 0;
  }
  /* when shown, let dropdown popovers overflow instead of being clipped */
  .top-chrome:not(.collapsed) {
    overflow: visible;
  }

  /* small tab at the top-center to bring the toolbar back */
  .reveal-tab {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: 46px;
    height: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #333;
    border-top: none;
    background: rgba(20, 20, 20, 0.82);
    border-radius: 0 0 9px 9px;
    color: #aaa;
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: background 0.12s, color 0.12s;
  }
  .reveal-tab:hover { background: #1f1f1f; color: #fff; }
  .reveal-icon { display: block; width: 14px; height: 14px; }

  .loading-bar {
    height: 2px;
    background: #e63946;
    transition: width 0.3s ease, opacity 0.4s ease;
  }

  /* Login caution banner — shown on Meta login pages while Desktop site is off */
  .login-caution {
    flex-shrink: 0;
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: #2a2410;
    border-bottom: 1px solid #4a3d12;
    color: #f0d98a;
    font-size: 12px;
  }
  .caution-icon { width: 15px; height: 15px; flex-shrink: 0; color: #f0c040; }
  .caution-text { flex: 1; line-height: 1.3; }
  .caution-text b { color: #ffe08a; }
  .caution-btn {
    flex-shrink: 0;
    padding: 4px 12px;
    border: none;
    border-radius: 6px;
    background: #4ea1ff;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-app-region: no-drag;
  }
  .caution-btn:hover { background: #3a8de0; }
</style>
