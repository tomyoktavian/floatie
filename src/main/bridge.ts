import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface BrowserInfo { name: string; path: string }
export interface ProfileInfo  { id: string; name: string; path: string }
export interface ExtensionInfo { id: string; name: string; version: string; path: string }

const HOME = homedir()

const BROWSERS_MAC: Record<string, string> = {
  Chrome: `${HOME}/Library/Application Support/Google/Chrome`,
  Brave:  `${HOME}/Library/Application Support/BraveSoftware/Brave-Browser`,
  Edge:   `${HOME}/Library/Application Support/Microsoft Edge`,
}

const BROWSERS_WIN: Record<string, string> = {
  Chrome: `${process.env['LOCALAPPDATA']}/Google/Chrome/User Data`,
  Brave:  `${process.env['LOCALAPPDATA']}/BraveSoftware/Brave-Browser/User Data`,
  Edge:   `${process.env['LOCALAPPDATA']}/Microsoft/Edge/User Data`,
}

export function detectBrowsers(): BrowserInfo[] {
  const map = process.platform === 'darwin' ? BROWSERS_MAC : BROWSERS_WIN
  return Object.entries(map)
    .filter(([, p]) => existsSync(p))
    .map(([name, path]) => ({ name, path }))
}

export function getProfiles(browserPath: string): ProfileInfo[] {
  const profiles: ProfileInfo[] = []
  try {
    const dirs = readdirSync(browserPath, { withFileTypes: true })
    for (const d of dirs) {
      if (!d.isDirectory()) continue
      if (d.name !== 'Default' && !/^Profile \d+$/.test(d.name)) continue
      const profilePath = join(browserPath, d.name)
      const prefsPath   = join(profilePath, 'Preferences')
      let name = d.name
      if (existsSync(prefsPath)) {
        try {
          const prefs = JSON.parse(readFileSync(prefsPath, 'utf-8'))
          name = prefs?.profile?.name ?? d.name
        } catch { /* ignore parse error */ }
      }
      profiles.push({ id: d.name, name, path: profilePath })
    }
  } catch { /* ignore read error */ }
  return profiles
}

export function listExtensionsFromProfile(profilePath: string): ExtensionInfo[] {
  const extDir = join(profilePath, 'Extensions')
  const result: ExtensionInfo[] = []
  if (!existsSync(extDir)) return result
  try {
    for (const extId of readdirSync(extDir)) {
      const extBase = join(extDir, extId)
      let versions: string[]
      try { versions = readdirSync(extBase).filter(v => existsSync(join(extBase, v, 'manifest.json'))) }
      catch { continue }
      if (!versions.length) continue
      const version = versions.sort().pop()!
      const manifestPath = join(extBase, version, 'manifest.json')
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        result.push({
          id:      extId,
          name:    manifest.name ?? extId,
          version: manifest.version ?? version,
          path:    join(extBase, version),
        })
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return result
}
