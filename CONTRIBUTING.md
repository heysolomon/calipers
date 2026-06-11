# Contributing to Calipers

Calipers is a community project and all contributions are welcome — code, documentation, design, bug reports, and feature ideas. Whether you're fixing a typo or building a new measurement mode, you're in the right place.

## Development Setup

**Prerequisites:** Node.js 18+, pnpm 8+

```bash
# Clone the repo
git clone https://github.com/heysolomon/calipers.git
cd calipers

# Install all workspace dependencies
pnpm install

# Build and watch the extension
pnpm dev --filter=@calipers/extension

# Run the companion website dev server
pnpm dev --filter=@calipers/web
```

### Loading the extension in Chrome

1. Run `pnpm dev --filter=@calipers/extension` — it watches for changes and rebuilds into `apps/extension/dist/`.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right).
4. Click **Load unpacked** and select `apps/extension/dist/`.
5. The Calipers icon appears in your toolbar. Press `⌘⇧M` (Mac) or `Ctrl+Shift+M` to activate.

## Architecture Overview

The project is a pnpm monorepo with three packages:

| Package | Path | Description |
|---|---|---|
| `@calipers/extension` | `apps/extension/` | Chrome extension (Vite + TypeScript) |
| `@calipers/web` | `apps/web/` | Companion Next.js website |
| `@calipers/shared` | `packages/shared/` | Types & messages shared between both |

**Extension internals:**

- `src/background/index.ts` — Service worker. Handles keyboard shortcuts, routes messages between popup and content script, manages per-tab state.
- `src/content/` — Content script. Injected into every page. Creates the canvas overlay, detects elements, draws highlights and measurement lines.
  - `overlay.ts` — Creates/destroys the `<canvas>` and label container.
  - `detector.ts` — `elementFromPoint` + `getBoundingClientRect` + `getComputedStyle`.
  - `renderer.ts` — All canvas drawing logic.
  - `modes/` — Isolated logic for each mode (inspect, measure, guides).
- `src/popup/` — React popup UI. Communicates with the background via `chrome.runtime.sendMessage`.

When you add a new feature, decide which layer it belongs to, then wire up the message types in `packages/shared/src/messages.ts` if cross-layer communication is needed.

## Branch Naming

| Type | Example |
|---|---|
| New feature | `feat/box-model-stagger-animation` |
| Bug fix | `fix/label-position-on-scroll` |
| Documentation | `docs/improve-measure-mode-guide` |
| Chore / tooling | `chore/upgrade-vite-5` |

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add distance-to-viewport-edge measurement
fix: prevent label from clipping outside viewport
docs: update keyboard shortcuts table in README
chore: upgrade @crxjs/vite-plugin to 2.0-beta.26
refactor: extract label positioning into shared utility
```

## Pull Request Process

1. Fork the repo and create your branch from `main`.
2. Make your changes, keeping commits focused and atomic.
3. Run `pnpm typecheck && pnpm lint` — fix any errors before opening a PR.
4. Open a pull request against `main`. Fill in the PR template.
5. At least one maintainer review is required before merging.

PRs that introduce new user-facing behaviour should include a short description of how to test the change manually.

## Code Style

- **TypeScript strict mode** throughout — no `any`, no type assertions without justification.
- **Prettier** for formatting (`pnpm format`), **ESLint** for lint (`pnpm lint`).
- Content script code is vanilla TypeScript — no React, no heavy dependencies.
- Popup code is React + Tailwind CSS.
- Keep the content script under ~30 KB (unminified). Profile before adding imports.

## Reporting Bugs

Use the [Bug Report template](https://github.com/heysolomon/calipers/issues/new?template=bug_report.yml). Please include:
- Browser + version
- Operating system
- Steps to reproduce
- Screenshots if helpful

## Suggesting Features

Open a [Feature Request](https://github.com/heysolomon/calipers/issues/new?template=feature_request.yml) or start a discussion in [GitHub Discussions](https://github.com/heysolomon/calipers/discussions).

## Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment.
