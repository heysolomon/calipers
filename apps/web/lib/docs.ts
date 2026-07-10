import { CHROME_STORE_URL, GITHUB_URL } from './site';

export type DocNavItem = {
  label: string;
  href: string;
};

export type DocNavSection = {
  section: string;
  items: DocNavItem[];
};

export const DOC_NAV: DocNavSection[] = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Installation', href: '/docs/getting-started/installation' },
      { label: 'Keyboard Shortcuts', href: '/docs/getting-started/shortcuts' },
    ],
  },
  {
    section: 'Modes',
    items: [
      { label: 'Inspect Mode', href: '/docs/features/inspect-mode' },
      { label: 'Measure Mode', href: '/docs/features/measure-mode' },
      { label: 'Alignment Guides', href: '/docs/features/guides' },
      { label: 'Colour Picker', href: '/docs/features/color-picker' },
      { label: 'Spacing Grid', href: '/docs/features/spacing-grid' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { label: 'Box Model Overlay', href: '/docs/features/box-model' },
      { label: 'Ruler Overlay', href: '/docs/features/rulers' },
      { label: 'Design Tokens', href: '/docs/features/design-tokens' },
      { label: 'Screenshot Export', href: '/docs/features/screenshot-export' },
    ],
  },
  {
    section: 'Project',
    items: [{ label: 'Contributing', href: '/docs/contributing' }],
  },
];

export type DocPage = {
  title: string;
  description: string;
  content: string;
};

export const DOC_PAGES: Record<string, DocPage> = {
  'getting-started/installation': {
    title: 'Installation',
    description: 'Install Calipers from the Chrome Web Store or build from source.',
    content: `
# Installation

Calipers is available as a Chrome extension from the Web Store, or you can build it from source for Chrome and Firefox.

## Chrome Web Store

1. Visit the [Calipers listing on the Chrome Web Store](${CHROME_STORE_URL}).
2. Click **Add to Chrome**.
3. Confirm the permissions prompt.
4. Activate Calipers with **Cmd+Shift+M** (Mac) or **Ctrl+Shift+M** (Windows/Linux), or click the extension icon in your toolbar.

## Build from source

\`\`\`bash
git clone ${GITHUB_URL}.git
cd calipers
pnpm install
pnpm build --filter=@calipers/extension
\`\`\`

Then load the extension in your browser:

1. Open **chrome://extensions** (Chrome) or **about:debugging** (Firefox).
2. Enable **Developer mode** (Chrome) or click **This Firefox** (Firefox).
3. Click **Load unpacked** and select \`apps/extension/dist/\`.

For Firefox, use the dedicated build:

\`\`\`bash
pnpm build --filter=@calipers/extension -- --config vite.config.firefox.ts
\`\`\`

## Browser support

| Browser | Status | Notes |
|---|---|---|
| Chrome | Supported | Manifest V3 |
| Firefox | Supported | Manifest V2 build |
| Edge | Supported | Uses Chrome Web Store build |
| Safari | Not supported | No extension API |

## Permissions

Calipers requests only what it needs:

- **activeTab** — inject the overlay on the page you are viewing
- **scripting** — run measurement tools when you activate Calipers
- **storage** — save guides and preferences locally
- **tabs** — capture screenshots when you press S

No data is collected or transmitted. See the [privacy policy](/privacy) for details.
    `.trim(),
  },

  'getting-started/shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'Every Calipers action has a keyboard shortcut for a fast, mouse-free workflow.',
    content: `
# Keyboard Shortcuts

Calipers is keyboard-first. Press **?** while Calipers is active to open the in-page shortcuts panel.

## Global

| Shortcut | Action |
|---|---|
| \`Cmd+Shift+M\` / \`Ctrl+Shift+M\` | Toggle Calipers on/off |
| \`1\` – \`5\` | Switch mode |
| \`B\` | Toggle box model overlay |
| \`D\` | Open design token panel |
| \`S\` | Capture screenshot |
| \`?\` | Show / hide shortcuts panel |
| \`Esc\` | Deactivate Calipers |

## Inspect mode

| Shortcut | Action |
|---|---|
| Hover | Show dimensions, typography, and element path |
| Click element | Open box model detail panel |
| \`B\` | Toggle box model rings on hovered element |

## Measure mode

| Shortcut | Action |
|---|---|
| Click | Pin an element (up to 5: A–E) |
| Click pinned element | Unpin it |
| Click label | Copy distance to clipboard |

## Guides mode

| Shortcut | Action |
|---|---|
| Click | Pin horizontal and vertical guides at cursor |
| Drag handle | Reposition a guide |
| \`Del\` / \`Backspace\` | Clear all guides |
| Right-click guide | Remove a single guide |

## Colour picker mode

| Shortcut | Action |
|---|---|
| Hover | Sample colours from element under cursor |
| Click swatch | Copy colour in active format (HEX / RGB / HSL) |

## Spacing grid mode

| Shortcut | Action |
|---|---|
| Hover parent | Show gaps between all sibling children |
    `.trim(),
  },

  'features/inspect-mode': {
    title: 'Inspect Mode',
    description: 'Hover any element to see dimensions, typography, viewport distances, and its CSS path.',
    content: `
# Inspect Mode

Inspect mode is the default when you activate Calipers. Hover over any element to see its exact rendered size and supporting context — without opening DevTools.

## How it works

1. Activate Calipers (\`Cmd+Shift+M\`).
2. Hover over any element on the page.
3. A dimension label shows \`width × height\` in pixels.
4. Click the label to copy the measurement.

## What you see

- **Dimensions** — rendered width and height from \`getBoundingClientRect()\`
- **Element path** — CSS selector breadcrumb (tag, id, and up to two classes per level)
- **Typography** — font family, size, weight, line-height, and letter-spacing on text nodes
- **Viewport distances** — dashed lines from element edges to the viewport edges with pixel labels
- **Box model rings** — when enabled, colour-coded margin, padding, border, and content layers

## Box model detail panel

Click any element to open the detail panel with exact computed values for margin, padding, border, and content on each side.

Toggle the overlay rings with \`B\` or the **Box model** toggle in the control panel. See [Box Model Overlay](/docs/features/box-model) for colour coding details.

## Rulers

Enable **Rulers** in the control panel to show pixel rulers along the viewport edges with a cursor crosshair — useful for checking alignment against the viewport grid.
    `.trim(),
  },

  'features/measure-mode': {
    title: 'Measure Mode',
    description: 'Click elements to measure pixel distance between their closest edges. Pin up to five elements at once.',
    content: `
# Measure Mode

Measure mode lets you click elements to see the pixel distance between their closest edges, with dimension lines and labels drawn on the canvas overlay.

## How it works

1. Switch to Measure mode — press \`2\` or select **Measure** in the control panel.
2. Click the **first element** — it stays highlighted and labelled **A**.
3. Click the **second element** — the gap between them is measured and labelled **B**.
4. Keep clicking to pin up to **five elements** (A through E). Every consecutive pair is measured simultaneously.
5. Click a pinned element again to unpin it.

## Smart edge detection

Calipers automatically finds the closest edges between two elements:

- Side-by-side elements → horizontal gap (right edge to left edge)
- Stacked elements → vertical gap (bottom edge to top edge)

Alignment guidelines are drawn when edges line up horizontally or vertically.

## Multi-element measurement

Pin three or more elements to compare a whole row or column at once. Each consecutive pair gets its own measurement line and label — useful for checking consistent spacing across a toolbar, card grid, or nav items.

## Copying measurements

Click any distance label to copy the value to your clipboard (e.g. \`24px\`).
    `.trim(),
  },

  'features/guides': {
    title: 'Alignment Guides',
    description: 'Place draggable horizontal and vertical guides with snap-to-element-edge support.',
    content: `
# Alignment Guides

Alignment guides are persistent horizontal and vertical lines you can place anywhere on the page to check alignment against your layout.

## Placing guides

1. Switch to Guides mode — press \`3\`.
2. Move the crosshair to the position you want.
3. Click anywhere on the page (outside the ruler strip) to drop a **horizontal and vertical guide** at that point.

## Moving guides

Drag the small handle (circle at the edge of the line) to reposition a guide. With **Snap to elements** enabled, guides snap to nearby element edges within 8px.

## Removing guides

- **Right-click** a guide or its handle to remove that single guide.
- Press **Del** or **Backspace** to clear all guides.

## Persistence

Guides are saved to \`chrome.storage.local\` and reload when you reopen Calipers. They survive mode switches — place guides in Guides mode, then switch to Inspect or Measure without losing them.

Toggle **Show guides** in the control panel to hide guides without deleting them.
    `.trim(),
  },

  'features/color-picker': {
    title: 'Colour Picker',
    description: 'Sample colours from any element and copy as HEX, RGB, or HSL.',
    content: `
# Colour Picker

Colour picker mode lets you sample colours from elements on the page and copy them in the format you need.

## How it works

1. Switch to Colour picker mode — press \`4\`.
2. Hover over any element.
3. The panel shows sampled colours: background, text, and border where applicable.
4. Click a swatch to copy it in the active format.

## Output formats

Toggle between three formats in the panel:

- **HEX** — \`#4A9EFF\` or \`#4A9EFF80\` with alpha
- **RGB** — \`rgb(74, 158, 255)\` or \`rgba(74, 158, 255, 0.5)\`
- **HSL** — \`hsl(210, 100%, 65%)\`

Values are read from \`window.getComputedStyle()\`, so they reflect the rendered colour — including inherited and computed values.
    `.trim(),
  },

  'features/spacing-grid': {
    title: 'Spacing Grid',
    description: 'Show all gaps between sibling elements at once by hovering their parent.',
    content: `
# Spacing Grid

Spacing grid mode reveals every gap between sibling elements in a single view — ideal for checking consistent spacing in nav bars, card rows, and form layouts.

## How it works

1. Switch to Spacing grid mode — press \`5\`.
2. Hover over a container element (a parent with two or more visible children).
3. Calipers highlights the parent and draws measurement lines between every consecutive sibling pair.
4. Each gap is labelled in pixels.

## Layout detection

Calipers detects whether siblings are arranged in a row or column by comparing the position of the first two children, then measures gaps along the predominant axis.

Hidden, zero-size, and Calipers overlay elements are excluded from the grid.
    `.trim(),
  },

  'features/box-model': {
    title: 'Box Model Overlay',
    description: 'Visualise margin, padding, border, and content as colour-coded rings on any element.',
    content: `
# Box Model Overlay

The box model overlay visualises the margin, border, padding, and content areas of any inspected element. It is available in Inspect and Measure modes.

## Enabling

- Press \`B\` to toggle the overlay.
- Or use the **Box model** toggle in the control panel.

## Colour coding

| Layer | Colour |
|---|---|
| Content | Blue (\`rgba(74,158,255,0.15)\`) |
| Padding | Green (\`rgba(80,200,140,0.15)\`) |
| Border | Amber (\`rgba(255,200,80,0.15)\`) |
| Margin | Coral (\`rgba(255,130,80,0.15)\`) |

Each layer has a subtle dashed border in the same colour family.

## Detail panel

Click any element in Inspect mode to open the detail panel with exact computed values for each side. Values come from \`window.getComputedStyle()\` — they reflect the rendered layout, not the stylesheet source.
    `.trim(),
  },

  'features/rulers': {
    title: 'Ruler Overlay',
    description: 'Pixel rulers along the viewport edges with a cursor crosshair.',
    content: `
# Ruler Overlay

The ruler overlay adds pixel rulers along the top and left viewport edges, with a crosshair tracking your cursor position — similar to ruler guides in design tools.

## Enabling

Toggle **Rulers** in the control panel. Rulers are available in every mode.

## What you see

- Pixel tick marks along the top and left edges of the viewport
- A horizontal and vertical crosshair line following your cursor
- A position label showing \`x, y\` coordinates

In Guides mode, the crosshair also previews where guides will be placed when you click.
    `.trim(),
  },

  'features/design-tokens': {
    title: 'Design Tokens',
    description: 'Extract CSS custom properties from the page and export as JSON.',
    content: `
# Design Tokens

The design token panel reads all CSS custom properties (\`--*\` variables) defined on the page and lets you export them as JSON.

## Opening the panel

Press \`D\` while Calipers is active, or click **Tokens** in the control panel.

## What it shows

Each token displays:

- **Name** — the custom property name (e.g. \`--color-primary\`)
- **Value** — the computed value
- **Type** — colour, spacing, typography, or other (classified automatically)

## Exporting

Click **Copy JSON** to copy all tokens as a JSON object to your clipboard — ready to paste into a design system file, Figma tokens plugin, or codebase.

## Click to copy

Click any individual token row to copy that single \`name: value\` pair.
    `.trim(),
  },

  'features/screenshot-export': {
    title: 'Screenshot Export',
    description: 'Capture the visible viewport with measurements overlaid as a PNG.',
    content: `
# Screenshot Export

Export the current viewport as a PNG with all Calipers measurements, guides, and overlays baked in.

## How to export

Press \`S\` while Calipers is active. The extension captures the visible tab via \`chrome.tabs.captureVisibleTab()\` and triggers a download.

The file is saved as \`calipers-{timestamp}.png\`.

## What is included

The screenshot captures exactly what you see — dimension labels, measurement lines, alignment guides, box model rings, and ruler overlays are all included in the export.

## Tips

- Position your measurements before exporting — the capture is instant.
- Use screenshot exports to attach spacing checks to PRs, design reviews, or bug reports.
    `.trim(),
  },

  contributing: {
    title: 'Contributing',
    description: 'Set up the dev environment and contribute to Calipers.',
    content: `
# Contributing to Calipers

All contributions are welcome — code, documentation, bug reports, feature requests, and design feedback.

## Dev environment

\`\`\`bash
git clone ${GITHUB_URL}.git
cd calipers
pnpm install
pnpm dev --filter=@calipers/extension
\`\`\`

Load \`apps/extension/dist/\` as an unpacked extension in Chrome. The dev server rebuilds on save.

To run the companion website locally:

\`\`\`bash
pnpm dev --filter=@calipers/web
\`\`\`

## Project structure

- \`apps/extension/\` — Chrome/Firefox extension (Vite + TypeScript)
  - \`src/background/\` — Service worker
  - \`src/content/\` — Content script, canvas overlay, and modes
  - \`src/popup/\` — Extension popup UI
- \`apps/web/\` — Companion website (Next.js)
- \`packages/shared/\` — Types and messages shared between extension and web

## Before opening a PR

1. Create a branch: \`feat/your-feature\` or \`fix/your-bug\`
2. Run \`pnpm typecheck && pnpm lint\`
3. Open a pull request against \`main\`

See [CONTRIBUTING.md](${GITHUB_URL}/blob/main/CONTRIBUTING.md) for commit format, branch naming, and the full PR process.

## Good first issues

Look for issues labelled [good first issue](${GITHUB_URL}/labels/good%20first%20issue) on GitHub.
    `.trim(),
  },
};

export function getAllDocSlugs(): string[] {
  return Object.keys(DOC_PAGES);
}

export function getDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES[slug];
}
