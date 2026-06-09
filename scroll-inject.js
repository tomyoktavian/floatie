;(function () {
  if (window.__mfScrollFixed) return
  window.__mfScrollFixed = true

  const THROTTLE = 650
  let lastScrollTime = 0
  let scrollCooldown = false

  // ── Find the video currently on screen ─────────────────
  function activeVideo() {
    const vids = Array.prototype.slice.call(document.querySelectorAll('video')).filter(function (v) {
      const r = v.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
    })
    return vids.filter(function (v) { return !v.paused && v.readyState > 2 })[0] || vids[0] || null
  }

  // ── Find the scrollable feed container around the video ─
  // TikTok / YouTube have none → fall back to a trusted host gesture.
  function findScrollable() {
    let el = activeVideo()
    while (el && el !== document.documentElement) {
      const s = getComputedStyle(el)
      const scrollable = s.overflowY === 'auto' || s.overflowY === 'scroll' || s.scrollSnapType !== 'none'
      if (scrollable && el.scrollHeight > el.clientHeight + 10) return el
      el = el.parentElement
    }
    return null
  }

  // Ask the host (main process) to perform a trusted CDP touch-swipe.
  // The host listens for this exact console marker on the webview.
  function requestHostGesture(dir) {
    console.log('__MFNAV__' + (dir > 0 ? '1' : '-1'))
  }

  // ── Universal navigation ────────────────────────────────
  function go(dir) {                       // dir: 1 = next, -1 = prev
    const c = findScrollable()
    if (c) {
      const before = c.scrollTop
      c.scrollBy({ top: dir * c.clientHeight, behavior: 'smooth' })
      // If the in-page container didn't move, let the host do a trusted swipe.
      setTimeout(function () {
        if (Math.abs(c.scrollTop - before) < 5) requestHostGesture(dir)
      }, 200)
    } else {
      requestHostGesture(dir)
    }
  }

  // ── Public API (also used by auto-scroll) ───────────────
  window.__mfScrollNext = function () { go(1) }
  window.__mfScrollPrev = function () { go(-1) }

  // ── Manual wheel → one video per tick (immersive only) ─
  window.addEventListener('wheel', function (e) {
    const v = activeVideo()
    if (!v) return                                       // normal page → native scroll
    const r = v.getBoundingClientRect()
    if (r.height < window.innerHeight * 0.6) return      // not an immersive feed → native scroll
    e.preventDefault()
    const now = Date.now()
    if (now - lastScrollTime < THROTTLE) return
    lastScrollTime = now
    go(e.deltaY > 0 ? 1 : -1)
  }, { passive: false, capture: true })

  // ── Auto-scroll: advance when the video ENDS, no replay ─
  function scheduleNext() {
    if (scrollCooldown) return
    scrollCooldown = true
    setTimeout(function () {
      scrollCooldown = false
      go(1)
    }, window.__mfScrollDelay != null ? window.__mfScrollDelay : 500)
  }

  document.addEventListener('ended', function (e) {
    if (!window.__mfAutoScrollEnabled) return
    if (!e.target || e.target.tagName !== 'VIDEO') return
    scheduleNext()
  }, true)

  document.addEventListener('timeupdate', function (e) {
    if (!window.__mfAutoScrollEnabled) return
    const v = e.target
    if (!v || v.tagName !== 'VIDEO' || !v.duration) return
    if (v.loop) v.loop = false                              // stop the clip looping/replaying
    if (v.currentTime >= v.duration - 0.35) scheduleNext()  // backup if 'ended' is suppressed
  }, true)
})()
