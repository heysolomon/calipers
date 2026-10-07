# Chrome Web Store Listing

Copy-paste reference for updating the [Raval Chrome Web Store listing](https://chromewebstore.google.com/detail/raval/anocimjcbeijomifkdcdkafdjphcdale).

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
3. Rebuild: `pnpm build --filter=@raval/extension`
4. Upload the new `apps/extension/dist/` ZIP to the Chrome Web Store
5. Submit for review — the dashboard will pick up the new title/summary after publish

The long **Description** field in the dashboard is the only listing text you edit directly in the store UI.

---

## Title (max 75 characters)

```
Raval — Measure & Inspect Web Pages
```

## Short description (max 132 characters)

```
Measure, inspect and annotate any webpage: sizes, gaps, fonts, colours and guides. Free and open source.
```

## Detailed description

```
Raval is a free, open-source Chrome extension for looking closely at any webpage. Open it on a page and you can read sizes, measure gaps, check fonts and colours, line things up with guides, and mark up what you find. No screenshots, no switching apps, no digging through DevTools.

Raval used to be called Calipers. It is the same extension with a new name, and your saved guides and settings carry over.

INSPECT
Hover over anything to see its width and height. Click a piece of text or an element to see its font, size, weight and line height, its colours in HEX, RGB or HSL, and its margin, padding, border and corner radius. Click any value to copy it.

MEASURE
Click one element, then another, and Raval shows the gap between them in pixels. Pin up to five at a time to check a whole row or column. Click a pinned element again to remove it.

GUIDES
Place horizontal and vertical guides anywhere on the page. They snap to the edges of nearby elements. Click a guide to delete it, or drag it to move it. Guides are saved for each page, so they are still there when you come back.

ANNOTATE
Mark up the page as you review it: size callouts, notes, arrows you can bend, and a freehand pen, in a choice of colours. Right-click anything to remove it.

ALSO INCLUDED
• Screenshots: save the whole view or just a region, with your measurements and notes on it
• Design tokens: list a page's CSS custom properties and export them as JSON
• Rulers: pixel rulers along the edges of the window
• Undo: Cmd/Ctrl+Z works in Measure, Guides and Annotate

KEYBOARD SHORTCUTS
Open Raval with Alt+Shift+C (Option+Shift+C on a Mac), or click its icon. Press 1 to 4 to switch between Inspect, Measure, Guides and Annotate, S for a screenshot, ? to see every shortcut, and Esc to close.

FREE AND OPEN SOURCE
Raval is MIT licensed. There is no account and no data collection. Your settings and guides are stored only in your browser.

Website: https://raval.solomonakuson.com
GitHub: https://github.com/heysolomon/raval
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
Raval provides pixel measurement, dimension inspection, and alignment tools for web designers and developers working on live webpages.
```

## Permission justifications


| Permission  | Justification                                                             |
| ----------- | ------------------------------------------------------------------------- |
| `activeTab` | Inject the measurement overlay into the page the user is viewing          |
| `scripting` | Run measurement tools on the active tab when the user activates Raval  |
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
[5s]  Raval is a free Chrome extension for pixel-perfect measurement.
[10s] Click two elements — see the exact distance in pixels.
[15s] Hover to inspect dimensions. Drop alignment guides. Toggle the box model.
[20s] Copy values, export screenshots, extract design tokens.
[25s] Keyboard-first. Open source. Free forever.
[30s] Install Raval today.
```

## Post-publish checklist

- [ ] Update all 5 screenshots with captioned feature callouts
- [ ] Add promo video (optional but high-impact)
- [ ] Link website and GitHub in the store support links
- [ ] Ask early users for reviews mentioning "measure distance" or "pixel ruler"
- [ ] Share listing on GitHub README, website, and social channels
