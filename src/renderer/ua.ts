// Per-destination User-Agent. Meta sites (FB/IG/Threads) load with a desktop UA
// because their login & "Log in with Facebook" SSO is far more reliable on
// desktop; everything else stays mobile for the immersive vertical feed.
export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
export const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const META_RE = /(?:^|\.)(?:facebook\.com|instagram\.com|threads\.net|threads\.com)$/i

export function uaFor(url: string): string {
  try { return META_RE.test(new URL(url).hostname) ? DESKTOP_UA : MOBILE_UA } catch { return MOBILE_UA }
}
