import { session } from 'electron'
import { existsSync } from 'fs'
import type Store from 'electron-store'

export async function loadSavedExtensions(store: Store<any>) {
  const paths: string[] = store.get('extensionPaths', [])
  if (!paths.length) return

  const ses = session.fromPartition('persist:floatie')
  const valid = paths.filter(p => existsSync(p))

  const results = await Promise.allSettled(
    valid.map(p => ses.loadExtension(p, { allowFileAccess: true }))
  )

  results.forEach((r, i) => {
    if (r.status === 'rejected')
      console.warn('[MF] Skip extension:', valid[i], r.reason?.message)
  })

  if (valid.length !== paths.length) store.set('extensionPaths', valid)
}
