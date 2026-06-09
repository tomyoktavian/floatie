// Injected into the guest webview. Auto-hides the site's own overlay UI
// (top bar, action rail, channel/caption) when the mouse is idle, and reveals
// it again on any mouse/touch movement — like a native video player.
;(function () {
  function selectorsFor() {
    const h = location.hostname
    if (h.includes('youtube'))   return ['ytm-mobile-topbar-renderer', 'yt-reel-player-overlay-view-model']
    if (h.includes('tiktok'))    return [
      '[data-e2e="like-icon"]', '[data-e2e="comment-icon"]', '[data-e2e="share-icon"]',
      '[data-e2e="music-cover"]', '[data-e2e="follow-button"]', '[data-e2e="video-author-avatar"]',
      '[data-e2e="video-username"]', '[data-e2e="video-desc"]', '[data-e2e="music-name"]',
      '[data-e2e="video-music-icon"]',
    ]
    if (h.includes('instagram')) return ['[aria-label="Like"]', '[aria-label="Comment"]', '[aria-label="Share"]', '[aria-label="Save"]', '[aria-label="More"]']
    return []
  }

  // Default ON; the host can flip window.__mfAutoHideControls to disable.
  if (window.__mfAutoHideControls === undefined) window.__mfAutoHideControls = true

  if (window.__mfAutoHideReady) return
  window.__mfAutoHideReady = true

  const sel = selectorsFor()
  if (!sel.length) return
  const list = sel.join(',')

  if (!document.getElementById('__mf_autohide_style')) {
    const style = document.createElement('style')
    style.id = '__mf_autohide_style'
    style.textContent =
      `:is(${list}){transition:opacity .25s ease!important}` +
      `html.mf-hide-ui :is(${list}){opacity:0!important;pointer-events:none!important}`
    ;(document.head || document.documentElement).appendChild(style)
  }

  let idle
  function show() {
    document.documentElement.classList.remove('mf-hide-ui')
    clearTimeout(idle)
    idle = setTimeout(hide, 2500)
  }
  function hide() {
    if (window.__mfAutoHideControls === false) return
    document.documentElement.classList.add('mf-hide-ui')
  }
  // Real desktop input only — NOT 'touchstart', which the auto-scroll's
  // synthetic touch-gesture would fire, flashing the controls on every advance.
  ;['mousemove', 'mousedown', 'wheel', 'keydown'].forEach(function (e) {
    document.addEventListener(e, show, true)
  })
  idle = setTimeout(hide, 2500)
})()
