<script lang="ts">
  let {
    webview = $bindable<Electron.WebviewTag | null>(null),
  }: { webview: Electron.WebviewTag | null } = $props()

  type ScrollMode = 'off' | 'smart' | 'timer'

  let mode         = $state<ScrollMode>('smart')
  let delayMs      = $state(300)
  let timerSeconds = $state(30)
  let timerInterval: ReturnType<typeof setInterval> | null = null

  // Restore saved settings, then push them into the page.
  $effect(() => {
    window.mf.getStore('autoScroll').then((v) => {
      const s = v as { mode: ScrollMode; delayMs: number; timerSeconds: number } | null
      if (s) {
        mode         = s.mode ?? 'smart'
        delayMs      = s.delayMs ?? 300
        timerSeconds = s.timerSeconds ?? 30
      }
      pushMode()
    })
  })

  function saveSettings() {
    window.mf.setStore('autoScroll', { mode, delayMs, timerSeconds })
  }

  // Push the current mode into the guest page. The injected flags reset on every
  // navigation, so this is re-run on each dom-ready / did-navigate as well.
  function pushMode() {
    if (!webview) return
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }

    if (mode === 'smart') {
      webview.executeJavaScript(
        `window.__mfAutoScrollEnabled = true; window.__mfScrollDelay = ${delayMs}`
      ).catch(() => {})
    } else if (mode === 'timer') {
      webview.executeJavaScript('window.__mfAutoScrollEnabled = false').catch(() => {})
      timerInterval = setInterval(() => {
        webview?.executeJavaScript('window.__mfScrollNext?.()').catch(() => {})
      }, timerSeconds * 1000)
    } else {
      webview.executeJavaScript('window.__mfAutoScrollEnabled = false').catch(() => {})
    }
  }

  function applyMode() {
    pushMode()
    saveSettings()
  }

  function setMode(m: ScrollMode) {
    mode = m
    applyMode()
  }

  // Re-apply the mode after every navigation (the page-side flags are wiped).
  $effect(() => {
    if (!webview) return
    const reapply = () => pushMode()
    webview.addEventListener('dom-ready', reapply)
    webview.addEventListener('did-navigate', reapply)
    return () => {
      webview?.removeEventListener('dom-ready', reapply)
      webview?.removeEventListener('did-navigate', reapply)
    }
  })

  $effect(() => {
    return () => { if (timerInterval) clearInterval(timerInterval) }
  })
</script>

<!-- Rendered inside the toolbar's 3-dot menu -->
<div class="as-section">
  <div class="as-title">
    <span class="i-lucide-arrow-down-up as-title-icon"></span>
    Auto-scroll
  </div>

  <div class="as-modes">
    <button class="as-pill" class:active={mode === 'off'}   onclick={() => setMode('off')}  title="Video loop seperti biasa">Off</button>
    <button class="as-pill" class:active={mode === 'smart'} onclick={() => setMode('smart')} title="Lanjut otomatis saat video selesai (tanpa loop)">Auto-next</button>
    <button class="as-pill" class:active={mode === 'timer'} onclick={() => setMode('timer')} title="Lanjut tiap sekian detik">Timer</button>
  </div>

  {#if mode === 'smart'}
    <div class="as-row">
      <span class="as-row-label">Jeda</span>
      <input class="as-slider" type="range" min="0" max="2000" step="100" bind:value={delayMs} oninput={applyMode} />
      <span class="as-row-val">{delayMs}ms</span>
    </div>
  {/if}
  {#if mode === 'timer'}
    <div class="as-row">
      <span class="as-row-label">Tiap</span>
      <input class="as-slider" type="range" min="5" max="120" step="5" bind:value={timerSeconds} oninput={applyMode} />
      <span class="as-row-val">{timerSeconds}s</span>
    </div>
  {/if}
</div>

<style>
  .as-section {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 4px 4px 2px;
  }

  .as-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9.5px;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .as-title-icon { display: block; width: 12px; height: 12px; color: inherit; }

  .as-modes { display: flex; gap: 4px; }

  .as-pill {
    flex: 1;
    padding: 4px 6px;
    border-radius: 6px;
    border: 1px solid #2a2a2a;
    background: #131313;
    color: #888;
    font-size: 10.5px;
    font-weight: 500;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
    white-space: nowrap;
  }
  .as-pill:hover { background: #1f1f1f; border-color: #383838; color: #bbb; }
  .as-pill.active {
    background: rgba(230, 57, 70, 0.12);
    border-color: rgba(230, 57, 70, 0.45);
    color: #e63946;
  }

  .as-row { display: flex; align-items: center; gap: 8px; padding: 0 2px; }
  .as-row-label {
    font-size: 11px; color: #999;
    font-family: system-ui, -apple-system, sans-serif;
    min-width: 34px;
  }
  .as-slider { flex: 1; accent-color: #e63946; cursor: pointer; }
  .as-row-val {
    font-size: 10px; color: #666; font-family: ui-monospace, monospace;
    min-width: 42px; text-align: right;
  }
</style>
