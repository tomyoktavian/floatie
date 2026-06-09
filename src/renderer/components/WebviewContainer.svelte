<script lang="ts">
  import scrollInjectSrc from '../scroll-inject-str'
  import videoInjectSrc  from '../video-inject-str'
  import autoHideSrc     from '../autohide-inject-str'

  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
             'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
             'Version/17.5 Mobile/15E148 Safari/604.1'

  let {
    ref = $bindable<Electron.WebviewTag | null>(null),
    currentUrl = $bindable(''),
    initialUrl = 'https://www.youtube.com/shorts/',
    onLoadStart,
    onLoadEnd,
  }: {
    ref        : Electron.WebviewTag | null
    currentUrl : string
    initialUrl : string
    onLoadStart: () => void
    onLoadEnd  : () => void
  } = $props()

  function injectScrollFix() {
    ref?.executeJavaScript(scrollInjectSrc).catch(() => {})
    ref?.executeJavaScript(videoInjectSrc).catch(() => {})
    ref?.executeJavaScript(autoHideSrc).catch(() => {})
  }

  $effect(() => {
    if (!ref) return

    ref.addEventListener('dom-ready',             injectScrollFix)
    ref.addEventListener('did-navigate',          injectScrollFix)
    ref.addEventListener('did-navigate-in-page',  injectScrollFix)

    ref.addEventListener('did-navigate',         (e: any) => { currentUrl = e.url })
    ref.addEventListener('did-navigate-in-page', (e: any) => { currentUrl = e.url })
    ref.addEventListener('did-start-loading',    onLoadStart)
    ref.addEventListener('did-stop-loading',     onLoadEnd)

    ref.addEventListener('page-title-updated', (e: any) => {
      document.title = e.title ? `${e.title} — Floatie` : 'Floatie'
    })

    // Bridge: the injected feed script asks the host for a trusted touch-swipe
    // when the page has no scrollable container (YouTube / TikTok).
    ref.addEventListener('console-message', (e: any) => {
      if (typeof e.message === 'string' && e.message.indexOf('__MFNAV__') === 0) {
        const dir = e.message.indexOf('-1') >= 0 ? -1 : 1
        window.mf.scrollGesture(dir, ref!.clientWidth, ref!.clientHeight)
      }
    })

  })
</script>

<div class="webview-host">
  <!-- svelte-ignore a11y_missing_attribute -->
  <webview
    bind:this={ref}
    class="webview-el"
    src={initialUrl}
    useragent={UA}
    partition="persist:floatie"
    allowpopups
  ></webview>
</div>

<style>
  /* fills the space between the top chrome and the bottom controls */
  .webview-host {
    flex: 1 1 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }
  /* absolute inset:0 makes the webview fill the host reliably — a plain
     height:100% on a <webview> falls back to the 150px default iframe height */
  .webview-el {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
</style>
