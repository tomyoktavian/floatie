<script lang="ts">
  let {
    webview = $bindable<Electron.WebviewTag | null>(null),
  }: { webview: Electron.WebviewTag | null } = $props()

  const SEEK = 5                 // seconds per skip
  const RATES = [1, 1.5, 2]      // playback-speed cycle

  let current   = $state(0)
  let duration  = $state(0)
  let hasVideo  = $state(false)
  let rateIdx   = $state(0)
  const rate    = $derived(RATES[rateIdx])

  const pct = $derived(duration > 0 ? Math.min(100, (current / duration) * 100) : 0)

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  function seek(delta: number) {
    webview?.executeJavaScript(`window.__mfVideoSeek?.(${delta})`).catch(() => {})
  }

  function applyRate() {
    webview?.executeJavaScript(`window.__mfVideoRate?.(${rate})`).catch(() => {})
  }

  function cycleRate() {
    rateIdx = (rateIdx + 1) % RATES.length
    applyRate()
  }

  function onTrackClick(e: MouseEvent) {
    const el = e.currentTarget as HTMLDivElement
    const r  = el.getBoundingClientRect()
    const frac = (e.clientX - r.left) / r.width
    webview?.executeJavaScript(`window.__mfVideoSeekTo?.(${frac})`).catch(() => {})
  }

  // Jump to the previous / next video in the feed (reuses the robust
  // container-scroll + trusted-gesture navigation).
  function nextVideo() { webview?.executeJavaScript('window.__mfScrollNext?.()').catch(() => {}) }
  function prevVideo() { webview?.executeJavaScript('window.__mfScrollPrev?.()').catch(() => {}) }

  // Poll the active video's state ~4×/sec to drive the progress bar.
  $effect(() => {
    if (!webview) return
    const id = setInterval(async () => {
      try {
        const s = await webview!.executeJavaScript('window.__mfVideoState?.()')
        if (s && typeof s === 'object') {
          current  = s.c
          duration = s.d
          hasVideo = true
          // Keep the chosen speed sticky across auto-advanced shorts.
          if (rate !== 1 && Math.abs((s.r ?? 1) - rate) > 0.01) applyRate()
        } else {
          hasVideo = false
        }
      } catch { hasVideo = false }
    }, 400)
    return () => clearInterval(id)
  })
</script>

<!-- bar background is draggable to move the window; controls are no-drag -->
<div class="vc-bar" class:vc-bar--idle={!hasVideo} style="-webkit-app-region: drag">
  <button class="vc-btn" onclick={() => seek(-SEEK)} title="Mundur {SEEK} detik (←)" aria-label="Rewind">
    <span class="i-lucide-rewind vc-icon"></span>
  </button>
  <button class="vc-btn" onclick={() => seek(SEEK)} title="Maju {SEEK} detik (→)" aria-label="Forward">
    <span class="i-lucide-fast-forward vc-icon"></span>
  </button>

  <button class="vc-rate" class:active={rate !== 1} onclick={cycleRate} title="Kecepatan putar">
    {rate}×
  </button>

  <div class="vc-progress">
    <span class="vc-time">{fmt(current)} / {fmt(duration)}</span>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="vc-track" onclick={onTrackClick} title="Klik untuk loncat">
      <div class="vc-fill" style:width="{pct}%"></div>
      <div class="vc-knob" style:left="{pct}%"></div>
    </div>
  </div>

  <div class="vc-divider"></div>

  <!-- Prev / next video -->
  <button class="vc-btn vc-btn--nav" onclick={prevVideo} title="Video sebelumnya (↑)" aria-label="Previous video">
    <span class="i-lucide-chevron-up vc-icon"></span>
  </button>
  <button class="vc-btn vc-btn--nav" onclick={nextVideo} title="Video berikutnya (↓)" aria-label="Next video">
    <span class="i-lucide-chevron-down vc-icon"></span>
  </button>
</div>

<style>
  .vc-bar {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 10px 6px;
    background: #141414;
    border-top: 1px solid #282828;
    border-radius: 0 0 11px 11px;
    flex-shrink: 0;
  }

  .vc-bar--idle {
    opacity: 0.45;
  }

  /* interactive controls must not be part of the window-drag region */
  .vc-btn, .vc-rate, .vc-track, .vc-progress { -webkit-app-region: no-drag; }

  .vc-btn {
    width: 24px;
    height: 22px;
    border-radius: 5px;
    border: 1px solid transparent;
    background: transparent;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    flex-shrink: 0;
    padding: 0;
  }

  .vc-btn:hover {
    background: #1e1e1e;
    border-color: #303030;
    color: #e0e0e0;
  }

  /* prev/next video buttons — a touch more prominent */
  .vc-btn--nav {
    width: 26px;
    color: #aaa;
    background: #1b1b1b;
    border-color: #2a2a2a;
  }
  .vc-btn--nav:hover {
    background: rgba(230, 57, 70, 0.12);
    border-color: rgba(230, 57, 70, 0.45);
    color: #e63946;
  }

  .vc-divider {
    width: 1px;
    height: 16px;
    background: #2a2a2a;
    flex-shrink: 0;
    margin: 0 1px;
  }

  .vc-icon {
    display: block;
    width: 13px;
    height: 13px;
  }

  .vc-rate {
    min-width: 30px;
    height: 22px;
    padding: 0 6px;
    border-radius: 5px;
    border: 1px solid #252525;
    background: transparent;
    color: #777;
    font-size: 10.5px;
    font-weight: 600;
    font-family: ui-monospace, monospace;
    cursor: pointer;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    flex-shrink: 0;
  }

  .vc-rate:hover {
    background: #1a1a1a;
    color: #ccc;
    border-color: #333;
  }

  .vc-rate.active {
    background: rgba(230, 57, 70, 0.1);
    border-color: rgba(230, 57, 70, 0.45);
    color: #e63946;
  }

  /* progress column: tiny time label stacked above the scrubber */
  .vc-progress {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .vc-track {
    width: 100%;
    height: 11px;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    min-width: 0;
  }

  /* the visible rail */
  .vc-track::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 4px;
    background: #2a2a2a;
  }

  .vc-fill {
    position: absolute;
    left: 0;
    height: 4px;
    border-radius: 4px;
    background: #e63946;
    pointer-events: none;
  }

  .vc-knob {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.12s;
  }

  .vc-track:hover .vc-knob {
    opacity: 1;
  }

  .vc-time {
    font-size: 8px;
    line-height: 1;
    color: #666;
    font-family: ui-monospace, monospace;
    letter-spacing: 0.02em;
    text-align: right;
    padding-right: 1px;
  }
</style>
