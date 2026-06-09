import {
  defineConfig,
  presetWind3,
  presetIcons,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({
      scale: 1,
      warn: true,
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then(i => i.default),
      },
    }),
  ],

  transformers: [
    transformerVariantGroup(),
  ],

  theme: {
    colors: {
      mf: {
        bg:      '#0a0a0a',
        surface: '#141414',
        sur2:    '#1e1e1e',
        bdr:     '#282828',
        bdr2:    '#363636',
        text:    '#efefef',
        muted:   '#888888',
        hint:    '#4a4a4a',
        accent:  '#e63946',
        pin:     '#f4a261',
        adblock: '#2dc653',
        dark:    '#457b9d',
        ext:     '#6366f1',
      },
    },
    fontFamily: {
      sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['ui-monospace', 'Cascadia Code', 'monospace'],
    },
  },

  shortcuts: {
    'tb-btn':
      'w-7 h-7 flex items-center justify-center rounded-[6px] ' +
      'bg-[#1e1e1e] border border-mf-bdr text-mf-muted text-[13px] ' +
      'hover:(bg-[#252525] border-[#363636] text-mf-text) ' +
      'transition-all duration-100 cursor-pointer select-none',

    'tb-btn--pin':     'border-mf-pin text-mf-pin bg-mf-pin/10',
    'tb-btn--adblock': 'border-mf-adblock text-mf-adblock bg-mf-adblock/10',
    'tb-btn--dark':    'border-mf-dark text-mf-dark bg-mf-dark/10',
    'tb-btn--ext':     'border-mf-ext text-mf-ext bg-mf-ext/10',

    'traffic-dot':
      'w-[11px] h-[11px] rounded-full border-none cursor-pointer ' +
      'transition-filter duration-150 hover:brightness-125',

    'ql-pill':
      'px-[9px] py-[3px] rounded-[20px] text-[10.5px] font-medium ' +
      'bg-[#1e1e1e] border border-mf-bdr text-mf-muted ' +
      'hover:text-mf-text transition-all duration-100 cursor-pointer whitespace-nowrap',
    'ql-pill--active': 'border-mf-accent text-mf-accent bg-mf-accent/10',

    'panel-base':
      'bg-mf-surface border-b border-mf-bdr overflow-hidden ' +
      'transition-[max-height] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
  },
})
