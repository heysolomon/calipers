# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Chrome extension with Inspect, Measure, and Guides modes
- Inspect mode — hover over any element to see its exact width and height
- Measure mode — click two elements to measure the pixel distance between closest edges
- Guides mode — draggable horizontal and vertical alignment guides with right-click removal
- Box model overlay with colour-coded layers (content, padding, border, margin) from `getComputedStyle`
- Floating dimension labels rendered as DOM elements with glassmorphic `backdrop-filter` styling
- Screenshot export via `chrome.tabs.captureVisibleTab()` with auto-download as PNG
- Copy-to-clipboard for all measurement labels with animated "Copied!" toast
- Glassmorphic popup UI (280px) with spring-animated micro-interactions throughout
- Segmented mode selector with spring-physics sliding indicator
- Per-mode settings panel (show box model, show guides, snap to elements)
- Master on/off toggle with blue glow when active
- Full keyboard shortcut support (1/2/3, B, C, S, Escape, ⌘⇧M)
- Canvas overlay with `devicePixelRatio` scaling for crisp rendering on Retina displays
- `requestAnimationFrame`-throttled mousemove handling for smooth 60fps overlays
- Measurement line animation — draws from centre outward over ~150ms
- Element highlight fade-in when switching hovered elements
- Companion Next.js 14 documentation website with App Router
- Landing page with hero, feature grid, keyboard shortcut reference, and open-source callout
- Documentation pages for all modes with MDX support
- Changelog page
- Dynamic OG image generation via `@vercel/og`
- Vercel Analytics and Speed Insights integration
- Shared `@calipers/shared` package for types and message protocol
- pnpm workspace + Turborepo monorepo setup
- MIT license, Contributor Covenant Code of Conduct, Contributing guide
- GitHub Actions CI (lint → typecheck → build on push and PR)
- GitHub issue templates for bug reports and feature requests
- Pull request template
