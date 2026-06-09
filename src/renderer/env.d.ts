/// <reference types="vite/client" />
/// <reference types="electron" />

declare interface Window {
  mf: {
    setAlwaysOnTop  : (v: boolean) => Promise<void>
    setOpacity      : (v: number)  => Promise<void>
    close           : () => Promise<void>
    minimize        : () => Promise<void>
    toggleAdblock   : (v: boolean) => Promise<void>
    getStore        : (k: string)  => Promise<unknown>
    setStore        : (k: string, v: unknown) => Promise<void>
    scrollGesture   : (dir: number, w: number, h: number) => Promise<void>
    extList         : () => Promise<unknown>
    extAdd          : () => Promise<void>
    extRemove       : (id: string) => Promise<void>
    extDetectBrowsers: () => Promise<unknown>
    extGetProfiles  : (p: string)  => Promise<unknown>
    extListFromProfile: (p: string) => Promise<unknown>
    extLoadSelected : (paths: string[]) => Promise<unknown>
    platform        : string
  }
}
