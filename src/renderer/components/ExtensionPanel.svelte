<script lang="ts">
  let {
    open = $bindable(false),
  }: { open: boolean } = $props()

  interface ExtEntry    { id: string; name: string; path: string }
  interface BrowserInfo { name: string; path: string }
  interface ProfileInfo { id: string; name: string; path: string }
  interface BrowserExt  { id: string; name: string; version: string; path: string }

  let loadedExts       = $state<ExtEntry[]>([])
  let browsers         = $state<BrowserInfo[]>([])
  let selectedBrowser  = $state<BrowserInfo | null>(null)
  let profiles         = $state<ProfileInfo[]>([])
  let selectedProfile  = $state<ProfileInfo | null>(null)
  let browserExts      = $state<BrowserExt[]>([])
  let selectedExtPaths = $state<Set<string>>(new Set())
  let detecting        = $state(false)

  $effect(() => {
    if (open) refreshLoaded()
  })

  async function refreshLoaded() {
    loadedExts = await window.mf.extList() as ExtEntry[]
  }

  async function addManual() {
    await window.mf.extAdd()
    await refreshLoaded()
  }

  async function removeExt(id: string) {
    await window.mf.extRemove(id)
    await refreshLoaded()
  }

  async function detectBrowsers() {
    detecting = true
    browsers = await window.mf.extDetectBrowsers() as BrowserInfo[]
    detecting = false
    selectedBrowser = null
    profiles = []
    browserExts = []
    selectedExtPaths = new Set()
  }

  async function selectBrowser(b: BrowserInfo) {
    selectedBrowser = b
    selectedProfile = null
    browserExts = []
    selectedExtPaths = new Set()
    profiles = await window.mf.extGetProfiles(b.path) as ProfileInfo[]
  }

  async function selectProfile(p: ProfileInfo) {
    selectedProfile = p
    browserExts = await window.mf.extListFromProfile(p.path) as BrowserExt[]
    selectedExtPaths = new Set()
  }

  function toggleExtSelection(path: string) {
    const s = new Set(selectedExtPaths)
    if (s.has(path)) s.delete(path)
    else s.add(path)
    selectedExtPaths = s
  }

  async function loadSelected() {
    const paths = [...selectedExtPaths]
    if (!paths.length) return
    await window.mf.extLoadSelected(paths)
    await refreshLoaded()
    selectedExtPaths = new Set()
  }
</script>

<div class="ep-panel" style:max-height={open ? '340px' : '0px'}>
  <div class="ep-scroll">

    <!-- Loaded extensions -->
    <section class="ep-section">
      <div class="ep-section-head">
        <span class="ep-section-title">
          <span class="i-lucide-puzzle ep-icon"></span>
          Loaded Extensions
        </span>
        <button class="ep-btn" onclick={addManual}>+ Add folder</button>
      </div>

      {#if loadedExts.length === 0}
        <p class="ep-empty">No extensions loaded</p>
      {:else}
        <ul class="ep-list">
          {#each loadedExts as ext}
            <li class="ep-item">
              <span class="ep-item-name">{ext.name || ext.id}</span>
              <button class="ep-remove" onclick={() => removeExt(ext.id)} title="Remove">
                <span class="i-lucide-x ep-remove-icon"></span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- Import from browser -->
    <section class="ep-section">
      <div class="ep-section-head">
        <span class="ep-section-title">
          <span class="i-lucide-download ep-icon"></span>
          Import from Browser
        </span>
        <button class="ep-btn" onclick={detectBrowsers}>
          {detecting ? 'Detecting…' : 'Detect'}
        </button>
      </div>

      {#if browsers.length > 0}
        <div class="ep-chips">
          {#each browsers as b}
            <button
              class="ep-chip"
              class:active={selectedBrowser?.name === b.name}
              onclick={() => selectBrowser(b)}
            >{b.name}</button>
          {/each}
        </div>

        {#if profiles.length > 0}
          <div class="ep-chips" style="margin-top:4px">
            {#each profiles as p}
              <button
                class="ep-chip"
                class:active={selectedProfile?.id === p.id}
                onclick={() => selectProfile(p)}
              >{p.name}</button>
            {/each}
          </div>
        {/if}

        {#if browserExts.length > 0}
          <ul class="ep-ext-list">
            {#each browserExts as ext}
              <li>
                <label class="ep-ext-row">
                  <input
                    type="checkbox"
                    checked={selectedExtPaths.has(ext.path)}
                    onchange={() => toggleExtSelection(ext.path)}
                    class="ep-checkbox"
                  />
                  <span class="ep-ext-name">{ext.name}</span>
                  <span class="ep-ext-ver">{ext.version}</span>
                </label>
              </li>
            {/each}
          </ul>
          <button
            class="ep-btn ep-btn--primary"
            onclick={loadSelected}
            disabled={selectedExtPaths.size === 0}
          >Load {selectedExtPaths.size} selected</button>
        {/if}
      {/if}
    </section>

  </div>
</div>

<style>
  .ep-panel {
    background: #0d0d0d;
    border-bottom: 1px solid #1e1e1e;
    overflow: hidden;
    transition: max-height 260ms cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }

  .ep-scroll {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    max-height: 332px;
  }

  .ep-section {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .ep-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ep-section-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9.5px;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .ep-icon {
    display: block;
    width: 11px;
    height: 11px;
    color: inherit;
  }

  .ep-btn {
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #2a2a2a;
    background: #1a1a1a;
    color: #888;
    font-size: 10px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .ep-btn:hover:not(:disabled) {
    background: #252525;
    border-color: #383838;
    color: #ccc;
  }

  .ep-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .ep-btn--primary {
    margin-top: 4px;
    border-color: rgba(99, 102, 241, 0.4);
    background: rgba(99, 102, 241, 0.1);
    color: #818cf8;
  }

  .ep-btn--primary:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.6);
    color: #a5b4fc;
  }

  .ep-empty {
    font-size: 10px;
    color: #3a3a3a;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .ep-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .ep-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
  }

  .ep-item-name {
    flex: 1;
    font-size: 10px;
    color: #ccc;
    font-family: system-ui, -apple-system, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ep-remove {
    background: transparent;
    border: none;
    color: #444;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 3px;
    transition: background 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .ep-remove:hover {
    background: rgba(230, 57, 70, 0.15);
    color: #e63946;
  }

  .ep-remove-icon {
    display: block;
    width: 10px;
    height: 10px;
  }

  .ep-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .ep-chip {
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid #252525;
    background: transparent;
    color: #555;
    font-size: 10px;
    font-family: system-ui, -apple-system, sans-serif;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .ep-chip:hover {
    background: #1a1a1a;
    border-color: #333;
    color: #aaa;
  }

  .ep-chip.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.4);
    color: #818cf8;
  }

  .ep-ext-list {
    list-style: none;
    max-height: 80px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1px;
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }

  .ep-ext-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 0;
    cursor: pointer;
  }

  .ep-checkbox {
    accent-color: #6366f1;
    flex-shrink: 0;
  }

  .ep-ext-name {
    flex: 1;
    font-size: 10px;
    color: #ccc;
    font-family: system-ui, -apple-system, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ep-ext-ver {
    font-size: 9px;
    color: #444;
    font-family: ui-monospace, monospace;
    flex-shrink: 0;
  }
</style>
