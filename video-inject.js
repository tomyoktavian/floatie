// Injected into the guest webview. Exposes helpers to control the active
// <video> element (the one currently playing / most visible in the viewport)
// so the host UI can seek, change speed, and read playback state.
;(function () {
  if (window.__mfVideoReady) return
  window.__mfVideoReady = true

  function activeVideo() {
    const vids = Array.prototype.slice
      .call(document.querySelectorAll('video'))
      .filter(function (v) {
        const r = v.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
      })
    if (!vids.length) return null
    // Prefer the one actually playing; otherwise the largest in-viewport one.
    const playing = vids.filter(function (v) { return !v.paused && v.readyState > 2 })[0]
    if (playing) return playing
    return vids.sort(function (a, b) {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      return rb.width * rb.height - ra.width * ra.height
    })[0]
  }

  // Seek by `delta` seconds, clamped to the clip bounds.
  window.__mfVideoSeek = function (delta) {
    const v = activeVideo()
    if (!v) return
    const dur = isFinite(v.duration) ? v.duration : v.currentTime + Math.abs(delta)
    v.currentTime = Math.max(0, Math.min(dur, v.currentTime + delta))
  }

  // Seek to a fraction (0..1) of the clip — used by the click-to-seek bar.
  window.__mfVideoSeekTo = function (frac) {
    const v = activeVideo()
    if (v && isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(1, frac)) * v.duration
  }

  // Set playback rate (1, 1.5, 2, ...).
  window.__mfVideoRate = function (r) {
    const v = activeVideo()
    if (v) v.playbackRate = r
  }

  // Compact playback state for polling, or null when there is no seekable video.
  window.__mfVideoState = function () {
    const v = activeVideo()
    if (!v || !isFinite(v.duration) || v.duration <= 0) return null
    return { c: v.currentTime, d: v.duration, p: v.paused, r: v.playbackRate }
  }

  // ── Autoplay with sound + per-app volume ───────────────
  // Sites (esp. YouTube mobile) start videos muted. The Chromium
  // autoplay-policy switch lets us unmute without a user gesture, so apply the
  // chosen app volume whenever a video starts or a new one loads. This only
  // touches this webview's media elements — never the system or other apps.
  if (window.__mfVolume === undefined) window.__mfVolume = 1

  function applyVol(v) {
    try {
      v.volume = window.__mfVolume
      v.muted = window.__mfVolume === 0
    } catch (e) { /* noop */ }
  }

  // Host calls this to set the app volume (0..1).
  window.__mfSetVolume = function (x) {
    window.__mfVolume = Math.max(0, Math.min(1, x))
    Array.prototype.forEach.call(document.querySelectorAll('video, audio'), applyVol)
  }

  ;['play', 'loadeddata', 'playing', 'canplay', 'volumechange'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      const t = e.target
      if (t && (t.tagName === 'VIDEO' || t.tagName === 'AUDIO')) applyVol(t)
    }, true)
  })
  // Sites (YouTube) restore their own remembered volume shortly after playback
  // starts — re-apply once more so the app volume stays the master.
  document.addEventListener('playing', function (e) {
    const t = e.target
    if (t && (t.tagName === 'VIDEO' || t.tagName === 'AUDIO')) setTimeout(function () { applyVol(t) }, 500)
  }, true)
  Array.prototype.forEach.call(document.querySelectorAll('video, audio'), applyVol)
})()
