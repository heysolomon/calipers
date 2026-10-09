import { CHROME_STORE_URL, GITHUB_URL } from './site';

/** Both numbers are refetched at most once an hour; a failed fetch just hides the number. */
const REVALIDATE = 3600;

/** "4", "1.2k", "3M": how a badge writes a count. */
function parseCount(text: string): number | null {
  const match = /^([\d.]+)\s*([kKmM]?)$/.exec(text.trim());
  if (!match?.[1]) return null;
  const scale = match[2] ? (match[2].toLowerCase() === 'k' ? 1_000 : 1_000_000) : 1;
  const value = Number(match[1]) * scale;
  return Number.isFinite(value) ? Math.round(value) : null;
}

/** Straight from GitHub. Exact, but see `getGithubStars` for why it often fails in production. */
async function starsFromGithub(repo: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    // GitHub rejects requests with no User-Agent; name ours rather than rely on the runtime's default.
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'raval-site',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    // Shows in the host's function logs why GitHub said no: "remaining 0" means the hourly allowance is spent.
    console.warn(`[stats] GitHub answered ${res.status} for ${repo}; rate limit remaining ${res.headers.get('x-ratelimit-remaining') ?? 'unknown'}`);
    return null;
  }
  const data = (await res.json()) as { stargazers_count?: unknown };
  return typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
}

/** The same number by way of shields.io, which asks GitHub with its own pool of tokens. */
async function starsFromBadge(repo: string): Promise<number | null> {
  const res = await fetch(`https://img.shields.io/github/stars/${repo}.json`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: unknown };
  return typeof data.value === 'string' ? parseCount(data.value) : null;
}

/**
 * GitHub allows 60 requests an hour per address without a token, and the site's host shares
 * its addresses with many other sites, so that allowance is usually already spent and GitHub
 * answers 403. Set GITHUB_TOKEN to lift the limit; without one, or if GitHub still refuses,
 * the count comes from shields.io instead.
 */
export async function getGithubStars(): Promise<number | null> {
  const repo = GITHUB_URL.replace('https://github.com/', '');
  for (const source of [starsFromGithub, starsFromBadge]) {
    try {
      const stars = await source(repo);
      if (stars !== null) return stars;
    } catch {
      // try the next source
    }
  }
  return null;
}

/**
 * The Chrome Web Store has no public API, so this reads the user count off the
 * listing page. If Google changes that page the number disappears rather than
 * showing something wrong.
 */
export async function getChromeUsers(): Promise<number | null> {
  try {
    const res = await fetch(CHROME_STORE_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RavalSite/1.0)', 'Accept-Language': 'en' },
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
