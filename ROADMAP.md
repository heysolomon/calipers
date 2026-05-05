# Roadmap

This roadmap outlines the planned development phases for Calipers. Items marked ✅ are shipped; items without a mark are planned. The roadmap is a living document — priorities shift based on community feedback.

Have a feature idea? [Open a feature request](https://github.com/calipers/calipers/issues/new?template=feature_request.yml) or start a thread in [Discussions](https://github.com/calipers/calipers/discussions).

---

## Phase 1 — MVP

The core measurement toolkit, available in the initial release.

- ✅ Inspect mode — hover to see element dimensions
- ✅ Measure mode — click two elements to measure distance between closest edges
- ✅ Copy measurements to clipboard
- ✅ Keyboard shortcuts for all actions
- ✅ Glassmorphic popup UI with on/off toggle and mode selector
- ✅ Canvas overlay with Retina display support

---

## Phase 2 — Power Features

Richer measurement tools and export capabilities.

- ✅ Box model overlay (margin, padding, border, content)
- ✅ Alignment guides (draggable, persistent, right-click to remove)
- ✅ Screenshot export with measurements overlaid
- ✅ Snap-to-element-edges in guides mode
- ✅ Distance measurement from element to viewport edges
- ✅ Multi-element selection (measure spacing across 3+ elements)
- ✅ Ruler overlay along viewport edges (pixel rulers like in design tools)
- ✅ Element path display (show the CSS selector of the inspected element)
- ✅ Persist guides and settings across sessions via `chrome.storage`

---

## Phase 3 — Cross-Platform & Integrations

Expanding beyond Chrome and adding design tool integrations.

- ✅ Firefox extension (WebExtensions API parity — MV2 manifest + dedicated Vite config)
- [ ] Figma plugin — import Calipers measurements directly into a Figma file
- ✅ Design token extraction — read CSS custom properties from the inspected page and export as JSON/CSS/Figma tokens
- ✅ Element spacing grid view — show all gaps between sibling elements at once
- ✅ Colour picker mode — sample any pixel's colour and copy as HEX/RGB/HSL
- ✅ Typography inspector — show font family, size, weight, line-height, letter-spacing for text nodes

---

## Phase 4 — Collaboration & Accessibility

Team-oriented features and accessibility-focused measurement tools.

- [ ] Shareable sessions — generate a link that replays a measurement session in another browser
- [ ] Measurement presets — save and name common measurements (e.g. "8pt grid", "nav height")
- [ ] Annotations — attach sticky notes to measured elements, exportable as PNG
- [ ] Accessibility auditing — contrast ratio checker, touch target size validator (WCAG 2.1 AA/AAA)
- [ ] Changelog diff mode — visually compare how element sizes changed between two page snapshots

---

## Out of Scope (for now)

- Deep iframe support (cross-origin iframes are a hard browser limitation)
- Mobile browser support (Chrome for Android has no extension API)
- Native desktop app (out of scope; the browser extension is the right form factor)
