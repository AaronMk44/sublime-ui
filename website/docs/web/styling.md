---
sidebar_position: 2
title: Styling
---

# Styling

On web, your design is driven by **one serializable token set** — not by
hand-written MUI theme code. The framework turns your tokens into a real Material
UI theme, so `@sublime-ui/library` components render as genuine MUI, themed from
the same source of truth that themes mobile.

## Tokens → MUI theme

Your tokens live in the **shared** `src/theme/` directory (`tokens.json` plus a
typed `tokens.ts`). The library generates a platform theme from them:

```ts
import { generateThemes } from '@sublime-ui/library';

const { muiTheme } = generateThemes(tokens, 'light');
// muiTheme → web (MUI) · paperTheme → mobile (Paper MD3)
```

The same token set produces a coherent MUI theme on web and a Paper MD3 theme on
mobile, so the two platforms stay in sync **by construction** — you never theme
the app twice.

## Wrap once, read anywhere

Wrap the web app a single time and the MUI theme flows to every component:

```tsx
<SublimeProvider tokens={tokens}>
  <App />
</SublimeProvider>;

// inside any component:
const tokens = useTokens();
```

`<SublimeProvider>` builds the MUI theme from your tokens and installs it, so
every library component picks up your colors, typography, and spacing. Read raw
tokens anywhere with `useTokens()` when you need a value directly.

## Customizing

- **Edit tokens, not style code.** Change `src/theme/tokens.ts` (or scaffold a
  fresh set with `sublime theme:init`). Both the MUI theme and the Paper theme
  update from that one edit — designers and developers work in tokens, not in two
  per-platform theme shapes.
- **Light and dark.** `generateThemes(tokens, mode)` takes the mode, so the same
  tokens yield matched light and dark MUI themes.
- **Reach for MUI when you must.** Because the web theme is a real MUI theme, you
  can still use MUI's `sx` and component APIs in a web screen — but prefer tokens
  for anything shared across platforms, so mobile stays in step.

For where tokens sit in the shared core relative to per-platform screens, see the
[Web overview](./overview.md).
