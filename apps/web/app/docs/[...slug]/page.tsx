import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string[] }>;
}

// Static doc pages — content lives in MDX files under /content/
const docPages: Record<string, { title: string; content: string }> = {
  'features/inspect-mode': {
    title: 'Inspect Mode',
    content: `
# Inspect Mode

Inspect mode is the default mode in Calipers. When active, hovering over any element
on the page reveals its exact width and height in a floating dimension label.

## How it works

1. Activate Calipers (\`⌘⇧M\`) — Inspect mode starts automatically.
2. Hover over any element on the page.
3. A glassmorphic label appears showing \`width × height\` in pixels.
4. Click the label to copy the measurement to your clipboard.

## Box Model Overlay

Press \`B\` (or toggle in the popup) to enable the box model overlay. This adds
colour-coded layers showing:

- **Content** — the element's content box (blue)
- **Padding** — padding area (green)
- **Border** — border area (amber)
- **Margin** — margin area (coral)

Values are read from \`window.getComputedStyle()\`, so they reflect the actual
rendered layout — not the CSS source values.
    `.trim(),
  },
  'features/measure-mode': {
    title: 'Measure Mode',
    content: `
# Measure Mode

Measure mode lets you click two elements to see the distance between them, with
a clear dimension line and label drawn between the closest edges.

## How it works

1. Switch to Measure mode — press \`2\` or click **Measure** in the popup.
2. Click the **first element** — it stays highlighted in blue.
3. Click the **second element** — the gap between them is measured automatically.
4. The measurement line draws from the closest edges with a perpendicular label showing the distance in pixels.
5. Click again to start a new measurement.

## Smart Edge Detection

Calipers automatically figures out which pair of edges is closest between the two
elements:

- Side-by-side elements: measures horizontal gap (right edge → left edge)
- Stacked elements: measures vertical gap (bottom edge → top edge)

## Copying the measurement

Click the distance label to copy the value to your clipboard (e.g. \`24px\`).
    `.trim(),
  },
  'features/guides': {
    title: 'Alignment Guides',
    content: `
# Alignment Guides

Alignment guides are persistent horizontal and vertical lines you can place
anywhere on the page to check alignment.

## Placing a guide

In Guides mode (\`3\`), click anywhere on the page to drop a guide. Calipers
automatically decides the axis based on your click position:

- Near the top/bottom edge → horizontal guide
- Near the left/right edge → vertical guide

## Moving guides

Drag the small handle (circle at the edge of the line) to reposition a guide.

## Removing guides

Right-click any guide (or its handle) to remove it.

## Persistence

Guides persist until you manually remove them or deactivate Calipers. They survive
mode switches, so you can place guides in Guides mode and then switch to Inspect or
Measure mode without losing them.
    `.trim(),
  },
  'features/box-model': {
    title: 'Box Model Overlay',
    content: `
# Box Model Overlay

The box model overlay is available in Inspect mode. It visualises the margin,
border, padding, and content areas of any inspected element.

## Enabling

- Press \`B\` to toggle the box model overlay.
- Or use the **Show box model** toggle in the popup (only active in Inspect mode).

## Colour coding

| Layer | Colour |
|---|---|
| Content | Blue (\`rgba(74,158,255,0.15)\`) |
| Padding | Green (\`rgba(80,200,140,0.15)\`) |
| Border | Amber (\`rgba(255,200,80,0.15)\`) |
| Margin | Coral (\`rgba(255,130,80,0.15)\`) |

Each layer has a subtle dashed border in the same colour family.

## Data source

Values are read from \`window.getComputedStyle()\` on the inspected element, so
they reflect actual computed styles — not the stylesheet source values.
    `.trim(),
  },
  contributing: {
    title: 'Contributing',
    content: `
# Contributing to Calipers

All contributions are welcome — code, documentation, bug reports, feature requests,
or design feedback.

## Setting up the dev environment

\`\`\`bash
git clone https://github.com/calipers/calipers.git
cd calipers
pnpm install
pnpm dev
\`\`\`

Then load \`apps/extension/dist/\` as an unpacked extension in Chrome.

## Project structure

- \`apps/extension/\` — Chrome extension (Vite + TypeScript)
  - \`src/background/\` — Service worker
  - \`src/content/\` — Content script + canvas overlay
  - \`src/popup/\` — React popup UI
- \`apps/web/\` — This website (Next.js)
- \`packages/shared/\` — Types and messages shared between extension and web

## Making a contribution

1. Fork the repo and create a branch: \`feat/your-feature\` or \`fix/your-bug\`
2. Make your changes
3. Run \`pnpm typecheck && pnpm lint\`
4. Open a pull request against \`main\`

See [CONTRIBUTING.md](https://github.com/calipers/calipers/blob/main/CONTRIBUTING.md) for full details.
    `.trim(),
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = docPages[slug.join('/')];
  return { title: page?.title ?? 'Docs' };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const slug_str = slug.join('/');
  const page = docPages[slug_str];

  if (!page) return notFound();

  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{ __html: simpleMarkdown(page.content) }}
    />
  );
}

/** Minimal markdown → HTML for doc pages */
function simpleMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/<p>\s*<\/p>/g, '');
}
