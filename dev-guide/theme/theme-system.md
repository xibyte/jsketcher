# JSketcher Theme System

JSketcher uses a runtime CSS-custom-property-based theming system that supports
both a **dark** (default) and a **light** theme. The theme can be toggled at
runtime without a page reload, and the user's preference is persisted to
`localStorage`.

---

## Architecture Overview

```
modules/ui/styles/theme.less        ← dark defaults on :root + LESS @ aliases
modules/ui/styles/theme-light.less  ← light overrides under body.theme-light
modules/ui/styles/theme.ts          ← runtime CSS-var resolver (for JS code)
modules/ui/styles/mixins.less       ← .button-behavior() mixin (themed)
web/app/cad/actions/coreActions.js  ← ToggleTheme action
web/app/cad/scene/viewer.ts         ← updateClearColor() for 3D canvas
web/app/cad/dom/components/WebApplication.jsx ← restores theme on mount
```

### How it works

1. **`theme.less`** defines all CSS custom properties on `:root` with dark-mode
   defaults. It also defines LESS `@`-prefixed aliases (e.g. `@font-color:
   var(--font-color)`) so `.less` files can use `@font-color` in property
   values while the actual colour is resolved at runtime by the browser.

2. **`theme-light.less`** re-declares the same CSS custom properties under the
   `body.theme-light` selector. When the `theme-light` class is present on
   `<body>`, the browser uses the light overrides; when absent, it falls back
   to the `:root` dark defaults.

3. **`theme.ts`** exports a `Proxy` object that reads CSS variable values via
   `getComputedStyle(document.documentElement)` at access time. This lets
   TypeScript/JavaScript code (e.g. `PartCatalog.tsx`, `CatalogPartChooser.tsx`)
   read themed colours without duplicating the palette.

4. **`ToggleTheme` action** (`coreActions.js`) toggles the `theme-light` class
   on `document.body`, persists the choice to `localStorage` under the key
   `jsketcher.theme`, and calls `viewer.updateClearColor()` so the 3D canvas
   background follows the theme.

5. **`WebApplication.jsx`** restores the saved theme on mount by reading
   `localStorage` and adding the `theme-light` class if needed.

6. **`sceneSetup.ts`** — `updateClearColor()` reads `--work-area-color` from
   `getComputedStyle(document.body)` and sets the Three.js renderer clear colour.

---

## The CSS Variable Palette

All variables are defined in `theme.less` (dark) and overridden in
`theme-light.less` (light). Below is the full catalogue grouped by purpose.

### Base grayscale ramp

A 10-step ramp from darkest (`--bg-color-0`) to lightest (`--bg-color-9`),
generated from `--hue-prim` and `--saturation` using `hsl()`.

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--bg-color-0` | 7% | 99% | Deepest background |
| `--bg-color-1` | 12% | 96% | Base body background (`--bg-base-color`) |
| `--bg-color-2` | 17% | 93% | Panels |
| `--bg-color-3` | 23% | 90% | Window title bars |
| `--bg-color-4` | 28% | 88% | Window body / popup body |
| `--bg-color-5` | 33% | 83% | Mid surfaces |
| `--bg-color-6` | 38% | 78% | Borders (`--border-color`) |
| `--bg-color-7` | 43% | 73% | |
| `--bg-color-8` | 48% | 68% | |
| `--bg-color-9` | 53% | 63% | |

### Typography

| Variable | Dark | Light |
|----------|------|-------|
| `--font-color-empph` | `#fff` | `#000` |
| `--font-color` | `hsl(0,0,90%)` | `hsl(0,0,15%)` |
| `--font-color-minor` | `hsl(0,0,80%)` | `hsl(0,0,30%)` |
| `--font-color-suppressed` | `hsl(0,0,65%)` | `hsl(0,0,45%)` |
| `--font-color-disabled` | `hsl(0,0,55%)` | `hsl(0,0,55%)` |

### Form controls

| Variable | Dark | Light |
|----------|------|-------|
| `--control-bg` | `#303030` | `#ffffff` |
| `--control-bg-focus` | `#173851` | `#e8f0fe` |
| `--control-border-focus` | `#326da3` | `#1a73e8` |
| `--control-color-number` | `#2fa1d6` | `#1565a8` |
| `--control-color-text` | `#9cdaf7` | `#0d4a7a` |
| `--control-selection-color` | `white` | `white` |
| `--control-selection-bg` | `blue` | `#1a73e8` |

### 3D work area

| Variable | Dark | Light |
|----------|------|-------|
| `--work-area-color` | `#4a4a4a` | `#d6dde3` |
| `--work-area-control-bar-bg-color` | `rgba(0,0,0,0.5)` | `rgba(255,255,255,0.7)` |
| `--work-area-control-bar-bg-color-active` | `#555` | `#ccc` |
| `--work-area-control-bar-font-color` | `--font-color-minor` | `--font-color-minor` |

### Toolbar (heads-up icon buttons)

| Variable | Dark | Light |
|----------|------|-------|
| `--toolbar-bg` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.5)` |
| `--toolbar-button-color` | `#999` | `#555` |
| `--toolbar-button-hover-bg` | `#333` | `#e0e0e0` |
| `--toolbar-button-hover-color` | `#fff` | `#222` |
| `--toolbar-button-disabled-hover-bg` | `#555` | `#f0f0f0` |
| `--toolbar-splitter-color` | (from ramp) | (from ramp) |

### Menu / context menu

| Variable | Dark | Light |
|----------|------|-------|
| `--menu-hover-bg` | `#0074D9` | `#1a73e8` |
| `--menu-active-bg` | `#000d7f` | `#1557b0` |
| `--menu-disabled-hover-bg` | `#545454` | `#e0e0e0` |
| `--menu-context-btn-color` | `rgba(255,255,255,0.2)` | `rgba(0,0,0,0.2)` |
| `--menu-context-btn-hover-color` | `#fff` | `#333` |
| `--menu-context-btn-active-color` | `#7f0807` | `#b00` |

### Widget (floating popup)

| Variable | Dark | Light |
|----------|------|-------|
| `--widget-bg` | `rgba(40,40,40,0.95)` | `rgba(255,255,255,0.95)` |
| `--widget-color` | `#fff` | `#222` |
| `--widget-border` | `#000` | `#ccc` |

### Symbol buttons

| Variable | Dark | Light |
|----------|------|-------|
| `--symbol-button-color` | `#fff` | `#333` |
| `--symbol-button-hover-color` | `#EFEFEF` | `#555` |
| `--symbol-button-active-color` | `#9cdaf7` | `#1565a8` |

### Semantic colours

| Variable | Dark | Light |
|----------|------|-------|
| `--color-danger` | `#b00` | `#c00` |
| `--color-danger-light` | `#d40000` | `#e03030` |
| `--color-accent` | `#2B7D2B` | `#1B6B1B` |
| `--color-accent-dark` | `#1f5a1f` | `#144a14` |
| `--color-neutral` | `#66727d` | `#8893a0` |
| `--color-neutral-dark` | `#4d5760` | `#6a7480` |
| `--color-highlight` | `#003f5d` | `#b0d8f0` |
| `--color-highlight-dark` | `#002a40` | `#80b0d0` |
| `--color-btn-selected` | `#285f7a` | `#8ab8d0` |

### Base button

| Variable | Dark | Light |
|----------|------|-------|
| `--button-bg` | `#3a3a3a` | `#e8e8e8` |
| `--button-color` | `#e0e0e0` | `#333` |

### Entity reference chips (wizard forms)

| Variable | Dark | Light |
|----------|------|-------|
| `--entity-ref-bg` | `#3a687d` | `#d0e0ea` |
| `--entity-ref-border` | `#d2d0e0` | `#aaa` |

### Entity tree overlay (inline styles in EntityTreeNode.tsx)

These are consumed via `var(--tree-text, ...)` directly in React inline styles
so the browser resolves them at paint time — no React re-render is needed when
the theme toggles.

| Variable | Dark | Light |
|----------|------|-------|
| `--tree-text` | `#f2f2f2` | `#222` |
| `--tree-text-muted` | `rgba(255,255,255,0.55)` | `rgba(0,0,0,0.5)` |
| `--tree-chevron` | `rgba(255,255,255,0.75)` | `rgba(0,0,0,0.6)` |
| `--tree-icon` | `rgba(255,255,255,0.85)` | `rgba(0,0,0,0.7)` |
| `--tree-eye` | `rgba(255,255,255,0.75)` | `rgba(0,0,0,0.6)` |
| `--tree-eye-off` | `rgba(255,255,255,0.25)` | `rgba(0,0,0,0.25)` |
| `--tree-row-bg` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.03)` |
| `--tree-hover-bg` | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.08)` |
| `--tree-text-shadow` | `0 1px 2px rgba(0,0,0,0.8)` | `none` |

### History timeline

| Variable | Dark | Light |
|----------|------|-------|
| `--history-item-bg` | `#737373` | `#e0e0e0` |
| `--history-item-hover-bg` | `#4d4d4d` | `#c8c8c8` |
| `--history-item-active-bg` | `#9c9c9c` | `#d0d0d0` |
| `--history-item-border` | `#2e2e2e` | `#bbb` |
| `--history-control-bg` | `#64808b` | `#b0c4d0` |
| `--history-control-hover-bg` | `#489` | `#a0b8c8` |
| `--history-control-active-bg` | `#5dc4da` | `#90a8b8` |
| `--history-disabled-bg` | `#828282` | `#f0f0f0` |
| `--history-disabled-border` | `#a7a7a7` | `#ccc` |
| `--history-disabled-color` | `#a7a7a7` | `#999` |
| `--history-opindex-shadow` | black outline | white outline |
| `--history-scroller-hover-bg` | `#BFBFBF` | `#d0d0d0` |
| `--history-scroller-active-bg` | `#7e7e7e` | `#bbb` |
| `--history-root-bg` | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.03)` |
| `--history-future-border` | `rgba(255,255,255,0.53)` | `rgba(0,0,0,0.3)` |
| `--history-add-color` | `rgba(255,255,255,0.53)` | `rgba(0,0,0,0.4)` |

### App shell (`web/css/app.less`)

| Variable | Dark | Light |
|----------|------|-------|
| `--app-bg` | `gray` | `#e8e8e8` |
| `--app-panel-bg` | `#444` | `#f0f0f0` |
| `--app-panel-border` | `#222222` | `#ccc` |
| `--app-btn-bg` | `#606060` | `#e0e0e0` |
| `--app-btn-border` | `#808080` | `#bbb` |
| `--app-btn-hover-bg` | `#808080` | `#d0d0d0` |
| `--app-btn-hover-border` | `#ccc` | `#999` |
| `--app-btn-color` | `#fff` | `#333` |
| `--app-selected-bg` | `#333` | `#d0e0ea` |
| `--app-selected-color` | `#ccc` | `#222` |
| `--app-tlist-color` | `#fff` | `#333` |
| `--app-tlist-border` | `#777` | `#ddd` |
| `--app-tlist-hover-bg` | `#222` | `#e0e8f0` |
| `--app-tool-caption-color` | `#fff` | `#333` |
| `--app-tool-caption-bg` | `#333` | `#e0e0e0` |
| `--app-scrollbar-track` | `white` | `#f0f0f0` |
| `--app-scrollbar-thumb` | `steelblue` | `#88aacc` |
| `--app-win-bg` | `#666` | `#f0f0f0` |
| `--app-win-border` | `#444444` | `#ccc` |
| `--app-status-color` | `#fff` | `#333` |
| `--app-tool-hint-color` | `#000` | `#333` |
| `--app-svg-icon-stroke` | `#fff` | `#333` |

### Sketcher explorers (in-scene UI)

| Variable | Dark | Light |
|----------|------|-------|
| `--explorer-item-bg` | `rgba(0,0,0,0.6)` | `rgba(255,255,255,0.85)` |
| `--explorer-item-border` | `#000` | `#ccc` |
| `--explorer-alt-color` | `#9c9c9c` | `#b0b0b0` |
| `--explorer-hover-bg` | `#0074D9` | `#1a73e8` |
| `--explorer-active-bg` | `#000d7f` | `#1557b0` |
| `--explorer-selected-grad1` | `#59acff` | `#7ab8ff` |
| `--explorer-selected-grad2` | `#0074D9` | `#1a73e8` |
| `--explorer-on-color` | `#005e82` | `#b0d0e8` |
| `--explorer-off-color` | `#5f5f5f` | `#c0c0c0` |
| `--explorer-aux-bg` | `#FDF7E7` | `#fff8e0` |
| `--explorer-aux-color` | `#1a1a1a` | `#333` |
| `--explorer-icon-bg` | `#606060` | `#d0d0d0` |
| `--explorer-titlebar-bg` | `rgba(0,0,0,0.7)` | `rgba(255,255,255,0.85)` |
| `--explorer-titlebar-color` | `#fff` | `#333` |
| `--contextual-bg` | `rgba(0,0,0,0.8)` | `rgba(255,255,255,0.88)` |
| `--contextual-color` | `#fff` | `#333` |
| `--sketcher-toolbar-btn-bg` | `#606060` | `#e0e0e0` |
| `--sketcher-toolbar-btn-border` | `#606060` | `#ccc` |
| `--sketcher-toolbar-focus` | `#0065dc` | `#1a73e8` |

### On-colour highlights (geometry selection overlays)

These are used when something is highlighted on top of 3D geometry. They are
intentionally bright/saturated so they stand out against the model.

| Variable | Dark | Light |
|----------|------|-------|
| `--on-color-highlight` | `#5A93BBFF` | `rgba(90,147,187,0.4)` |
| `--on-color-highlight-variant-yellow` | `bisque` | `#b8860b` |
| `--on-color-highlight-variant-pink` | `hotpink` | `#c71585` |
| `--on-color-highlight-variant-red` | `tomato` | `#cd3700` |
| `--on-color-highlight-variant-green` | `springgreen` | `#228b22` |
| `--on-color-highlight-variant-blue` | `aquamarine` | `#4682b4` |

---

## LESS `@` Aliases

Every CSS variable has a matching LESS alias defined in `theme.less`:

```less
@font-color: var(--font-color);
@button-bg: var(--button-bg);
/* ... etc ... */
```

This lets `.less` files use the familiar `@variable-name` syntax:

```less
.my-component {
  color: @font-color;
  background-color: @button-bg;
}
```

At compile time, LESS outputs `color: var(--font-color)` — the actual colour
is resolved by the browser at runtime from whichever theme is active.

---

## Using Theme Colours in Code

### In `.less` files

Import theme.less at the top of your file (if not already imported via a
parent):

```less
@import "~ui/styles/theme.less";

.my-component {
  background-color: @widget-bg;
  color: @widget-color;
  border: 1px solid @widget-border;
}
```

### In TypeScript/JavaScript (inline styles)

For React components that use inline styles, reference the CSS variable
directly with a fallback:

```tsx
const COLORS = {
  text: 'var(--tree-text, #f2f2f2)',
  muted: 'var(--tree-text-muted, rgba(255,255,255,0.55))',
};

<div style={{ color: COLORS.text }}>Hello</div>
```

This approach requires **no React re-render** when the theme toggles — the
browser resolves `var()` at paint time.

### In TypeScript via the theme proxy

For code that needs the actual computed value (not a CSS string), use the
`theme.ts` proxy:

```ts
import theme from 'ui/styles/theme';

const bgColor = theme.bgColor4; // reads getComputedStyle at access time
```

> **Note:** The proxy reads from `document.documentElement` (`:root`). If you
> need a value that is only overridden under `body.theme-light`, read it from
> `document.body` instead.

---

## The `.button-behavior()` Mixin

Defined in `modules/ui/styles/mixins.less`, this mixin accepts explicit light
and dark colour variants instead of using LESS `darken()`:

```less
.button-behavior(@color; @colorDark) {
  background-color: @color;
  &:hover { background-color: @colorDark; }
  &:active { background-color: @colorDark; }
}
```

Usage:

```less
.my-button {
  .button-behavior(@color-accent; @color-accent-dark);
}
```

---

## Adding a New Themed Colour

1. **Add the CSS variable** to `theme.less` under `:root` with the dark default.
2. **Add the light override** to `theme-light.less` under `body.theme-light`.
3. **Add the LESS `@` alias** at the bottom of `theme.less`.
4. **Use it** in your `.less` file via `@your-variable-name`.

Example:

```less
/* theme.less — :root block */
--my-feature-bg: #1a1a2e;

/* theme.less — @ aliases */
@my-feature-bg: var(--my-feature-bg);

/* theme-light.less — body.theme-light block */
--my-feature-bg: #f0f4ff;
```

```less
/* your-component.less */
@import "~ui/styles/theme.less";

.my-feature {
  background-color: @my-feature-bg;
}
```

---

## Theme Toggle Action

The `ToggleTheme` action is registered in `web/app/cad/actions/coreActions.js`
and surfaced in the right control bar via `uiConfigBundle.js`.

```js
{
  id: 'ToggleTheme',
  appearance: {
    cssIcons: ['sun-o'],
    label: 'theme',
    info: 'toggle between dark and light theme',
  },
  invoke: ({services}) => {
    document.body.classList.toggle('theme-light');
    localStorage.setItem('jsketcher.theme',
      document.body.classList.contains('theme-light') ? 'light' : 'dark');
    services.viewer.updateClearColor();
  }
}
```

On application mount, `WebApplication.jsx` restores the saved theme:

```jsx
const savedTheme = localStorage.getItem('jsketcher.theme');
if (savedTheme === 'light') {
  document.body.classList.add('theme-light');
}
```

---

## Visual Reference Page

A self-contained HTML page at `dev-guide/theme/theme-guide.html` renders
all theme colours and UI component styles in both dark and light mode
side-by-side. Open it directly in a browser — no server required.

The CSS variable blocks in the HTML are **auto-generated** from the real
`theme.less` and `theme-light.less` files. To regenerate after changing
the theme:

```bash
node dev-guide/theme/generate-theme-guide.js
```

The generator extracts the `:root` block from `theme.less` and the
`body.theme-light` block from `theme-light.less` and injects them
between `/* BEGIN AUTO-GENERATED THEME VARS */` and
`/* END AUTO-GENERATED THEME VARS */` markers in the HTML. Do not edit
the variable blocks in the HTML directly — edit the `.less` files and
re-run the generator.

---

## Intentionally Non-Themed Colours

Some colours are deliberately kept constant across both themes because they
represent semantic meaning, not UI chrome:

- **`svg.less`** — geometry line/constraint colours (`#c5bbff`, `#9fffa3`,
  `#bcffc1`, `#aaaaaa`) used in the 2D sketcher viewport
- **`HistoryTimeline.less`** — status indicators: `#ff940b` (active
  timesplitter), `#00ffe4` (selected border), `#648268` (in-progress green),
  `#ff3a1e` (hover stroke)
- **`Expressions.less` / `TerminalView.less`** — `#C4E1A4` terminal green text
- **`OperationHistory.less`** — `#780000` error red
- **`ActionInfo.less`** — `#E1A4A4` error pink
- **`EntityList.less`** — `#a9a91a` / `#feffcb` edit-button accent
