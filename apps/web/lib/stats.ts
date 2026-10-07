import { CHROME_STORE_URL, GITHUB_URL } from './site';

/** Both numbers are refetched at most once an hour; a failed fetch just hides the number. */
const REVALIDATE = 3600;

export async function getGithubStars(): Promise<number | null> {
  try {
    const repo = GITHUB_URL.replace('https://github.com/', '');
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: unknown };
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

/**
 * The Chrome Web Store has no public API, so this reads the user count off the
 * listing page. If Google changes that page the number disappears rather than
 * showing something wrong.
 */
export async function getChromeUsers(): Promise<number | null> {
  try {
    const res = await fetch(CHROME_STORE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CalipersSite/1.0)', 'Accept-Language': 'en' },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const match = /([\d,]+)\+? users?\b/.exec(await res.text());
    if (!match?.[1]) return null;
    const users = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(users) ? users : null;
  } catch {
    return null;
  }
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
