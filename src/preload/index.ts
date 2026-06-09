import { contextBridge, ipcRenderer } from 'electron'

const mf = {
  // Window
  setAlwaysOnTop : (v: boolean)  => ipcRenderer.invoke('win:setAlwaysOnTop', v),
  setOpacity     : (v: number)   => ipcRenderer.invoke('win:setOpacity', v),
  close          : ()            => ipcRenderer.invoke('win:close'),
  minimize       : ()            => ipcRenderer.invoke('win:minimize'),

  // Adblock
  toggleAdblock  : (v: boolean)  => ipcRenderer.invoke('adblock:toggle', v),

  // Store
  getStore       : (k: string)   => ipcRenderer.invoke('store:get', k),
  setStore       : (k: string, v: unknown) => ipcRenderer.invoke('store:set', k, v),

  // Trusted touch-swipe navigation (fallback for YouTube/TikTok)
  scrollGesture  : (dir: number, w: number, h: number) => ipcRenderer.invoke('mf:scrollGesture', dir, w, h),

  // Extensions (Sprint 3)
  extList          : ()                   => ipcRenderer.invoke('ext:list'),
  extAdd           : ()                   => ipcRenderer.invoke('ext:add'),
  extRemove        : (id: string)         => ipcRenderer.invoke('ext:remove', id),
  extDetectBrowsers: ()                   => ipcRenderer.invoke('ext:detectBrowsers'),
  extGetProfiles   : (p: string)          => ipcRenderer.invoke('ext:getProfiles', p),
  extListFromProfile: (p: string)         => ipcRenderer.invoke('ext:listFromProfile', p),
  extLoadSelected  : (paths: string[])    => ipcRenderer.invoke('ext:loadSelected', paths),

  platform: process.platform as NodeJS.Platform,
} as const

contextBridge.exposeInMainWorld('mf', mf)

export type MfAPI = typeof mf
