import Link from 'next/link';
import type { ReactNode } from 'react';

const ACCENT = '#FF4500';
const BLUE = '#2F6BFF';
const MONO = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

/** A small drawing of each tool, in the colours the extension itself uses. */
const SVG = { viewBox: '0 0 200 96', width: '100%', fill: 'none', 'aria-hidden': true } as const;
const block = { fill: 'rgba(0,0,0,0.04)', stroke: 'rgba(0,0,0,0.1)' } as const;
const label = { fontFamily: MONO, fontSize: 8.5, fontWeight: 500 } as const;

const TILES: { name: string; hint: string; href: string; art: ReactNode }[] = [
  {
    name: 'Inspect', hint: '1', href: '/docs/features/inspect-mode',
    art: (
      <svg {...SVG}>
        <rect x="40" y="18" width="120" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />
        <rect x="52" y="30" width="56" height="6" rx="3" fill="rgba(0,0,0,0.16)" />
        <rect x="52" y="43" width="84" height="6" rx="3" fill="rgba(0,0,0,0.08)" />
        <rect x="72" y="70" width="56" height="16" rx="5" fill="#fff" stroke="rgba(0,0,0,0.1)" />
        <text x="100" y="81" textAnchor="middle" fill="#000" {...label}>240 × 88</text>
      </svg>
    ),
  },
  {
    name: 'Measure', hint: '2', href: '/docs/features/measure-mode',
    art: (
      <svg {...SVG}>
        <rect x="22" y="26" width="54" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />
        <rect x="124" y="26" width="54" height="44" rx="3" fill="rgba(255,69,0,0.12)" stroke={ACCENT} />
        <path d="M76 48h48M76 44v8M124 44v8" stroke={ACCENT} />
        <rect x="88" y="29" width="24" height="14" rx="4" fill={ACCENT} />
        <text x="100" y="39" textAnchor="middle" fill="#fff" {...label}>48</text>
        <circle cx="22" cy="26" r="7" fill={ACCENT} />
        <text x="22" y="29" textAnchor="middle" fill="#fff" {...label}>A</text>
        <circle cx="124" cy="26" r="7" fill={ACCENT} />
        <text x="124" y="29" textAnchor="middle" fill="#fff" {...label}>B</text>
      </svg>
    ),
  },
  {
    name: 'Guides', hint: '3', href: '/docs/features/guides',
    art: (
      <svg {...SVG}>
        <rect x="58" y="28" width="84" height="40" rx="3" {...block} />
        <path d="M58 0v96M0 28h200" stroke={ACCENT} />
        <path d="M142 0v96" stroke={ACCENT} strokeOpacity="0.4" strokeDasharray="3 3" />
        <rect x="146" y="76" width="30" height="14" rx="4" fill="#fff" stroke="rgba(0,0,0,0.1)" />
        <text x="161" y="86" textAnchor="middle" fill="#000" {...label}>142</text>
      </svg>
    ),
  },
  {
    name: 'Annotate', hint: '4', href: '/docs/features/annotate',
    art: (
      <svg {...SVG}>
        <rect x="24" y="44" width="70" height="34" rx="3" {...block} />
        <path d="M150 30C132 22 112 30 100 46" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M100 46l1.5-9M100 46l9-2" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" />
        <text x="122" y="52" fill={BLUE} fontFamily={`'Caveat', 'Bradley Hand', 'Segoe Print', cursive`} fontSize="13">
          more space
        </text>
      </svg>
    ),
  },
  {
    name: 'Screenshot', hint: 'S', href: '/docs/features/screenshot-export',
    art: (
      <svg {...SVG}>
        <rect x="30" y="20" width="62" height="20" rx="3" {...block} />
        <rect x="30" y="48" width="100" height="28" rx="3" {...block} />
        <rect x="20" y="10" width="124" height="76" stroke="#000" strokeDasharray="4 3" />
        {[[20, 10], [144, 10], [20, 86], [144, 86]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x! - 2.5} y={y! - 2.5} width="5" height="5" fill="#fff" stroke="#000" />
        ))}
        <text x="150" y="94" fill="#737373" {...label}>124 × 76</text>
      </svg>
    ),
  },
  {
    name: 'Design tokens', hint: 'D', href: '/docs/features/design-tokens',
    art: (
      <svg {...SVG}>
        {[
          ['--accent', '#FF4500', ACCENT],
          ['--text', '#000000', '#000'],
          ['--muted', '#737373', '#737373'],
          ['--surface', '#F7F7F7', '#F7F7F7'],
        ].map(([name, value, fill], i) => (
          <g key={name} transform={`translate(34 ${14 + i * 20})`}>
            <rect width="10" height="10" rx="2" fill={fill} stroke="rgba(0,0,0,0.1)" />
            <text x="18" y="8.5" fill="#000" {...label}>{name}</text>
            <text x="132" y="8.5" textAnchor="end" fill="#737373" {...label}>{value}</text>
          </g>
        ))}
      </svg>
    ),
  },
];

/** The six-cell grid from the landing page: one cell per tool, each linking to its guide. */
export function FeatureTiles() {
  return (
    <ul className="lp-tiles" aria-label="What Calipers does">
      {TILES.map(({ name, hint, href, art }) => (
        <li key={name} className="lp-tile">
          <Link href={href} className="lp-tile-card">
            <span className="lp-tile-art">{art}</span>
            <span className="lp-tile-caption">
              <span>{name}</span>
              <kbd title={`Press ${hint}`}>{hint}</kbd>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
