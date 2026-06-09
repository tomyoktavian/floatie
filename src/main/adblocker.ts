import { ElectronBlocker, adsAndTrackingLists } from '@cliqz/adblocker-electron'
import { session } from 'electron'

let blocker: ElectronBlocker | null = null

const MF_SESSION = () => session.fromPartition('persist:floatie')

export async function initAdblock() {
  // Network filters only — cosmetic filtering injects a session preload into the
  // guest webview's partition which aborts main-frame loads on YouTube/TikTok.
  // Uses Node.js 20 / Electron 33 native global fetch to download the lists.
  blocker = await ElectronBlocker.fromLists(fetch, adsAndTrackingLists, {
    loadCosmeticFilters: false,
    loadNetworkFilters : true,
  })
  blocker.enableBlockingInSession(MF_SESSION())
}

export function toggleAdblock(enabled: boolean) {
  if (!blocker) return
  if (enabled) blocker.enableBlockingInSession(MF_SESSION())
  else blocker.disableBlockingInSession(MF_SESSION())
}
