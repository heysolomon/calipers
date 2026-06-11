<div align="center">

# Calipers

**Precision measurement for the web.**

![Demo](docs/assets/demo.gif)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-lightgrey?style=flat-square&logo=google-chrome)](https://chrome.google.com/webstore)
[![GitHub Stars](https://img.shields.io/github/stars/calipers/calipers?style=flat-square&color=4A9EFF)](https://github.com/heysolomon/calipers/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/calipers/calipers?style=flat-square)](https://github.com/heysolomon/calipers/issues)
[![Contributors](https://img.shields.io/github/contributors/calipers/calipers?style=flat-square)](https://github.com/heysolomon/calipers/graphs/contributors)

</div>

---

## What is Calipers?

Calipers is a free, open-source Chrome extension that lets designers and developers instantly measure distances, inspect dimensions, and check alignment on any webpage. Think PixelSnap, but for the browser — with direct DOM access for pixel-perfect accuracy.

Activate it with `⌘⇧M`, hover over any element, and immediately see its exact size. No screenshots. No switching apps.

---

## Features

- **Inspect mode** — hover over elements to see `width × height` in a floating label
- **Measure mode** — click two elements and see the pixel distance between their closest edges
- **Alignment guides** — drag horizontal and vertical guide lines anywhere on the page
- **Box model overlay** — colour-coded margin, padding, border, and content visualisation
- **Screenshot export** — capture the viewport with measurements overlaid, saved as PNG
- **Keyboard-first** — every action has a shortcut; no mouse required

---

## Install

### From the Chrome Web Store _(coming soon)_

> The Chrome Web Store listing is in progress. Star this repo to get notified.

### From Source

```bash
# 1. Clone
git clone https://github.com/heysolomon/calipers.git
cd calipers

# 2. Install dependencies
pnpm install

# 3. Build the extension
pnpm build --filter=@calipers/extension

# 4. Load in Chrome
#    → chrome://extensions → Enable Developer mode → Load unpacked → select apps/extension/dist/
```

---

## Development

**Prerequisites:** Node.js 18+, pnpm 8+

```bash
# Install all workspace dependencies
pnpm install

# Watch-build the extension (reloads on save)
pnpm dev --filter=@calipers/extension

# Run the companion website locally
pnpm dev --filter=@calipers/web

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck

# Production build
pnpm build
```

After running the extension dev server, load `apps/extension/dist/` as an unpacked extension in Chrome.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | TypeScript, Canvas API, Chrome Manifest V3 |
| Popup UI | React 18, Tailwind CSS |
| Bundler | Vite + `@crxjs/vite-plugin` |
| Website | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Monorepo | pnpm workspaces + Turborepo |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧M` / `Ctrl+Shift+M` | Toggle Calipers on/off |
| `1` | Switch to Inspect mode |
| `2` | Switch to Measure mode |
| `3` | Switch to Guides mode |
| `B` | Toggle box model overlay |
| `C` | Copy current measurement |
| `S` | Take screenshot |
| `Esc` | Deactivate / cancel |

---

## Contributing

Contributions of all kinds are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, branch naming conventions, commit format, and the PR process.

Good first issues are labelled [`good first issue`](https://github.com/heysolomon/calipers/labels/good%20first%20issue).

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features, or track progress on the [GitHub Projects board](https://github.com/heysolomon/calipers/projects).

---

## Community

- **Bugs & features:** [GitHub Issues](https://github.com/heysolomon/calipers/issues)
- **Discussion:** [GitHub Discussions](https://github.com/heysolomon/calipers/discussions)
- **Website & docs:** [calipers.solomonakuson.com](https://calipers.solomonakuson.com)

---

## License

[MIT](LICENSE) © Calipers Contributors
