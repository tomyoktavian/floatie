<script lang="ts">
  let {
    currentUrl = '',
    onNavigate,
  }: { currentUrl: string; onNavigate: (url: string) => void } = $props()

  interface CustomLink { label: string; url: string }

  const LINKS = [
    { label: 'Shorts',  icon: 'i-simple-icons-youtube',   color: '#FF0000', url: 'https://www.youtube.com/shorts/'  },
    { label: 'TikTok',  icon: 'i-simple-icons-tiktok',    color: '#FE2C55', url: 'https://www.tiktok.com/'          },
    { label: 'Reels',   icon: 'i-simple-icons-instagram', color: '#E1306C', url: 'https://www.instagram.com/reels/' },
    { label: 'FB',      icon: 'i-simple-icons-facebook',  color: '#1877F2', url: 'https://m.facebook.com/reels/'    },
    { label: 'X',       icon: 'i-simple-icons-x',         color: '#e7e9ea', url: 'https://x.com/home'               },
    { label: 'Threads', icon: 'i-simple-icons-threads',   color: '#e7e9ea', url: 'https://www.threads.net/'         },
  ]

  let customLinks = $state<CustomLink[]>([])
  let showAdd  = $state(false)
  let newLabel = $state('')
  let newUrl   = $state('')

  $effect(() => {
    window.mf.getStore('customLinks').then((v) => { if (Array.isArray(v)) customLinks = v as CustomLink[] })
  })

  // Close the add form on Escape
  $effect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') showAdd = false }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function save() { window.mf.setStore('customLinks', $state.snapshot(customLinks)) }

  function normalizeUrl(u: string) {
    u = u.trim()
    if (!u) return ''
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    return u
  }
  function deriveLabel(u: string) {
    try { return new URL(u).hostname.replace(/^(www\.|m\.)/, '').split('.')[0] } catch { return 'Link' }
  }

  function addLink() {
    const url = normalizeUrl(newUrl)
    if (!url) return
    const label = (newLabel.trim() || deriveLabel(url)).slice(0, 18)
    customLinks = [...customLinks, { label, url }]
    save()
    newLabel = ''; newUrl = ''; showAdd = false
  }
  function removeLink(i: number) {
    customLinks = customLinks.filter((_, idx) => idx !== i)
    save()
  }
  function fillCurrent() {
    newUrl = currentUrl
    newLabel = deriveLabel(currentUrl)
  }

  function isActive(linkUrl: string) {
    try {
      const base = new URL(linkUrl).hostname.replace(/^(www\.|m\.)/, '')
      const curr = new URL(currentUrl).hostname.replace(/^(www\.|m\.)/, '')
      return curr.includes(base)
    } catch { return false }
  }
</script>

<div class="ql-wrap">
  <div class="ql-bar" style="-webkit-app-region: no-drag">
    {#each LINKS as link}
      <button class="ql-pill" class:active={isActive(link.url)} style="--brand: {link.color}" onclick={() => onNavigate(link.url)} title={link.url}>
        <span class="{link.icon} ql-icon" style:color={link.color}></span>
        {link.label}
      </button>
    {/each}

    {#each customLinks as link, i}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="ql-pill ql-pill--custom" class:active={isActive(link.url)} onclick={() => onNavigate(link.url)} title={link.url}>
        <span class="i-lucide-link ql-icon"></span>
        {link.label}
        <button class="ql-x" onclick={(e) => { e.stopPropagation(); removeLink(i) }} title="Hapus link" aria-label="Remove">
          <span class="i-lucide-x ql-x-icon"></span>
        </button>
      </div>
    {/each}

    <button class="ql-pill ql-add-btn" class:active={showAdd} onclick={() => { showAdd = !showAdd; if (showAdd && !newUrl) fillCurrent() }} title="Tambah link" aria-label="Add link">
      <span class="i-lucide-plus ql-icon"></span>
    </button>
  </div>

  {#if showAdd}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="ql-add-backdrop" onclick={() => showAdd = false}></div>
    <div class="ql-add-pop">
      <input class="ql-input" placeholder="Nama (opsional)" bind:value={newLabel} spellcheck={false} />
      <input
        class="ql-input"
        placeholder="https://…"
        bind:value={newUrl}
        spellcheck={false}
        autocomplete="off"
        onkeydown={(e) => e.key === 'Enter' && addLink()}
      />
      <div class="ql-add-actions">
        <button class="ql-add-secondary" onclick={fillCurrent} title="Pakai halaman yang sedang dibuka">
          <span class="i-lucide-globe ql-add-ic"></span> Halaman ini
        </button>
        <button class="ql-add-primary" onclick={addLink}>Tambah</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .ql-wrap {
    position: relative;
    background: #141414;
    border-bottom: 1px solid #1e1e1e;
    flex-shrink: 0;
  }

  .ql-bar {
    display: flex;
    gap: 4px;
    padding: 2px 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .ql-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    border: 1px solid #252525;
    background: #0f0f0f;
    color: #555;
    font-size: 10.5px;
    font-weight: 500;
    font-family: system-ui, -apple-system, sans-serif;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
    flex-shrink: 0;
    letter-spacing: 0.01em;
  }
  .ql-pill:hover { background: #1a1a1a; border-color: #383838; color: #ddd; }
  .ql-pill.active {
    background: color-mix(in srgb, var(--brand, #e63946) 15%, transparent);
    border-color: color-mix(in srgb, var(--brand, #e63946) 55%, transparent);
    color: var(--brand, #e63946);
  }

  .ql-icon { display: block; width: 12px; height: 12px; color: inherit; flex-shrink: 0; }

  /* custom links: remove button revealed on hover */
  .ql-pill--custom { padding-right: 5px; }
  .ql-x {
    display: flex; align-items: center; justify-content: center;
    width: 0; height: 14px; padding: 0; margin-left: 0;
    border: none; background: transparent; color: #777;
    border-radius: 50%; cursor: pointer; overflow: hidden;
    transition: width 0.12s, background 0.1s, color 0.1s;
  }
  .ql-pill--custom:hover .ql-x { width: 14px; margin-left: 1px; }
  .ql-x:hover { background: rgba(230, 57, 70, 0.2); color: #e63946; }
  .ql-x-icon { display: block; width: 9px; height: 9px; }

  .ql-add-btn { padding: 3px 7px; }

  /* add popover */
  .ql-add-backdrop { position: fixed; inset: 0; z-index: 40; }
  .ql-add-pop {
    position: absolute;
    top: calc(100% - 1px);
    left: 6px;
    z-index: 50;
    width: 220px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 9px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    animation: ql-in 0.12s ease;
  }
  @keyframes ql-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

  .ql-input {
    height: 26px;
    background: #0f0f0f;
    border: 1px solid #2a2a2a;
    border-radius: 6px;
    color: #d0d0d0;
    font-size: 11px;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 0 8px;
    outline: none;
  }
  .ql-input:focus { border-color: #444; }
  .ql-input::placeholder { color: #555; }

  .ql-add-actions { display: flex; gap: 6px; }

  .ql-add-secondary, .ql-add-primary {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    height: 26px; border-radius: 6px; cursor: pointer;
    font-size: 11px; font-family: system-ui, -apple-system, sans-serif;
    border: 1px solid #2a2a2a; transition: background 0.1s, border-color 0.1s, color 0.1s;
  }
  .ql-add-secondary { flex: 1; background: #131313; color: #999; }
  .ql-add-secondary:hover { background: #1f1f1f; color: #ccc; border-color: #383838; }
  .ql-add-ic { display: block; width: 12px; height: 12px; }
  .ql-add-primary { padding: 0 14px; background: rgba(230, 57, 70, 0.14); border-color: rgba(230, 57, 70, 0.45); color: #e63946; font-weight: 600; }
  .ql-add-primary:hover { background: rgba(230, 57, 70, 0.24); }
</style>
