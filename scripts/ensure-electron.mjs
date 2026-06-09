// Postinstall guard: make sure the Electron binary is actually downloaded.
// This electron package ships without its own postinstall in this setup, so the
// binary would otherwise be missing and `npm run dev` fails with an
// "Electron failed to install correctly" error. Runs electron's own installer.
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const installer = 'node_modules/electron/install.js'
const pathFile  = 'node_modules/electron/path.txt'
const distDir   = 'node_modules/electron/dist'

if (!existsSync(installer)) {
  // electron not installed (e.g. `npm install --omit=dev`) — nothing to do
  console.log('[postinstall] electron not present, skipping binary install')
} else if (existsSync(distDir) && existsSync(pathFile)) {
  console.log('[postinstall] Electron binary already installed')
} else {
  console.log('[postinstall] downloading Electron binary…')
  execFileSync(process.execPath, [installer], { stdio: 'inherit' })
}
