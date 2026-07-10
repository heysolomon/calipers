# Chrome Web Store Listing

Copy-paste reference for updating the [Calipers Chrome Web Store listing](https://chromewebstore.google.com/detail/calipers/anocimjcbeijomifkdcdkafdjphcdale).

---

## Important: title & short description come from the extension package

In the Chrome Web Store dashboard, **Title** and **Summary** show as *"from package"* and **cannot be edited in the dashboard**. Chrome reads them from your uploaded ZIP:


| Store field                 | Manifest field        | File                           |
| --------------------------- | --------------------- | ------------------------------ |
| Title                       | `name`                | `apps/extension/manifest.json` |
| Summary (short description) | `description`         | `apps/extension/manifest.json` |
| Long description            | Editable in dashboard | Store listing → Description    |


To change the title or summary:

1. Edit `apps/extension/manifest.json` (`name` and `description`)
2. Bump `version` (e.g. `0.1.0` → `0.1.1`)
3. Rebuild: `pnpm build --filter=@calipers/extension`
4. Upload the new `apps/extension/dist/` ZIP to the Chrome Web Store
5. Submit for review — the dashboard will pick up the new title/summary after publish

The long **Description** field in the dashboard is the only listing text you edit directly in the store UI.

---

## Title (max 75 characters)

```
Calipers — Measure & Inspect Web Pages
```

## Short description (max 132 characters)

```
Measure pixel distances, inspect element sizes, and check alignment on any webpage. Free, open source.
```

## Detailed description

```
Calipers is a free, open-source Chrome extension for designers and frontend developers who need pixel-perfect measurements on live web pages.

Measure spacing, inspect dimensions, and verify alignment — without screenshots, without switching apps, and without digging through DevTools.

━━━ MEASURE DISTANCE BETWEEN ELEMENTS ━━━
Click two elements and instantly see the pixel gap between their closest edges. Pin up to 5 elements and measure every pair at once. Copy any value to your clipboard with one click.

━━━ INSPECT ELEMENT DIMENSIONS ━━━
Hover over any element to see its exact width × height. View typography details, CSS selector path, and distances to the viewport edges — all overlaid on the page.

━━━ ALIGNMENT GUIDES ━━━
Drop horizontal and vertical guide lines anywhere on the page. Drag them into position with snap-to-element-edge support. Guides persist across sessions so you can switch modes without losing your layout.

━━━ BOX MODEL OVERLAY ━━━
Visualise margin, padding, border, and content as colour-coded rings directly on the element. Toggle on/off with a single keystroke.

━━━ MORE TOOLS ━━━
• Colour picker — sample and copy colours as HEX, RGB, or HSL
• Spacing grid — show all gaps between sibling elements at once
• Design tokens — extract CSS custom properties and export as JSON
• Screenshot export — capture the viewport with measurements baked in
• Ruler overlay — pixel rulers along viewport edges with crosshair

━━━ KEYBOARD-FIRST ━━━
Every action has a shortcut. Switch modes with 1–5, toggle overlays with B, export screenshots with S, and deactivate with Esc. Built for speed.

━━━ FREE & OPEN SOURCE ━━━
Calipers is MIT-licensed and fully open source. No account required. No data collection. Your preferences are stored locally in your browser.

Install Calipers and bring pixel-perfect precision to every webpage you work on.

Website: https://calipers.solomonakuson.com
GitHub: https://github.com/heysolomon/calipers
```

## Category

**Developer Tools**

## Language

English

## Screenshot captions (suggested)

Use these as text overlays on each of the 5 store screenshots:

1. **Measure pixel distance between any two elements**
2. **Inspect width × height on hover — no DevTools needed**
3. **Drag alignment guides that snap to element edges**
4. **Box model overlay — margin, padding, border, content**
5. **Keyboard-first workflow with shortcuts for every action**

## Single purpose description (for Chrome Web Store review)

```
Calipers provides pixel measurement, dimension inspection, and alignment tools for web designers and developers working on live webpages.
```

## Permission justifications


| Permission  | Justification                                                             |
| ----------- | ------------------------------------------------------------------------- |
| `activeTab` | Inject the measurement overlay into the page the user is viewing          |
| `scripting` | Run measurement tools on the active tab when the user activates Calipers  |
| `storage`   | Save user preferences and guide positions locally in the browser          |
| `tabs`      | Capture a screenshot when the user exports the viewport with measurements |


## Keywords to weave into listing (for store search)

- measure distance
- pixel ruler
- inspect element size
- alignment guides
- box model
- frontend QA
- design handoff
- spacing checker
- chrome extension
- pixel perfect

## Promo video script (30 seconds, optional)

```
[0s]  Measuring spacing on a webpage shouldn't require screenshots or DevTools.
[5s]  Calipers is a free Chrome extension for pixel-perfect measurement.
[10s] Click two elements — see the exact distance in pixels.
[15s] Hover to inspect dimensions. Drop alignment guides. Toggle the box model.
[20s] Copy values, export screenshots, extract design tokens.
[25s] Keyboard-first. Open source. Free forever.
[30s] Install Calipers today.
```

## Post-publish checklist

- [ ] Update all 5 screenshots with captioned feature callouts
- [ ] Add promo video (optional but high-impact)
- [ ] Link website and GitHub in the store support links
- [ ] Ask early users for reviews mentioning "measure distance" or "pixel ruler"
- [ ] Share listing on GitHub README, website, and social channels
