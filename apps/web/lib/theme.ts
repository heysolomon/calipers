/** Where the chosen theme is remembered. */
export const THEME_KEY = 'raval-theme';

/** The key used before the rename; still read so a returning visitor keeps their theme. */
const LEGACY_THEME_KEY = 'calipers-theme';

/** The page background in each theme, for the browser's own chrome (`theme-color`). */
export const THEME_COLOUR = { light: '#f7f7f7', dark: '#121212' } as const;

/**
 * Runs in <head> before the page paints, so the saved theme (or, failing that,
 * the system's) is already applied on the first frame.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||localStorage.getItem('${LEGACY_THEME_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='dark'?'${THEME_COLOUR.dark}':'${THEME_COLOUR.light}'}catch(e){}})()`;
