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
    <Toolbar bind:webview={webviewRef} bind:currentUrl bind:extPanelOpen onHide={() => setToolbarHidden(true)} />
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

  <!-- video fills the middle -->
  <WebviewContainer
    bind:ref={webviewRef}
    bind:currentUrl
    initialUrl="https://www.youtube.com/shorts/"
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
</style>
