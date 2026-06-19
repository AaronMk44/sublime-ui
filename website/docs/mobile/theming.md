---
sidebar_position: 4
title: Theming on Mobile
---

# Theming on Mobile

On mobile, your design is driven by **one serializable token set** — not by
hand-written Paper theme code. The framework turns your tokens into a real
**React Native Paper (MD3)** theme, so `@sublime-ui/library` components render as
genuine Paper, themed from the same source of truth that themes web.

You theme the app once, in tokens; both platforms stay in sync by construction.

## Tokens → Paper theme

Your tokens live in the **shared** `src/theme/` directory (`tokens.json` plus a
typed `tokens.ts`) — the same set that produces the MUI theme on web. The library
generates a platform theme from them:

```ts
import { generateThemes } from '@sublime-ui/library';

const { paperTheme } = generateThemes(tokens, 'light');
// paperTheme → mobile (Paper MD3) · muiTheme → web (MUI)
```

One token set produces a coherent Paper MD3 theme on mobile and a MUI theme on web,
so `tone="danger"` is the same red whether the pixel is painted by Paper or by MUI.
You never theme the app twice.

## Wrap once, read anywhere

Wrap the mobile app a single time and the Paper theme flows to every component:

```tsx
<SublimeProvider tokens={tokens}>
  <App />
</SublimeProvider>;

// inside any component:
const tokens = useTokens();
```

`<SublimeProvider>` builds the Paper theme from your tokens and installs it (it
mounts Paper's theme provider under the hood), so every library component picks up
your colors, typography, and spacing. Read raw tokens directly anywhere with
`useTokens()`:

```tsx
import { useTokens } from '@sublime-ui/library';

function Price() {
  const tokens = useTokens();
  return <Text style={{ color: tokens.colors.primary }}>$9.99</Text>;
}
```

Calling `useTokens()` outside a `<SublimeProvider>` throws.

## Customizing

- **Edit tokens, not style code.** Change `src/theme/tokens.ts` (or scaffold a
  fresh set with `sublime theme:init`). Both the Paper theme and the MUI theme
  update from that one edit — you work in tokens, not in two per-platform theme
  shapes.
- **Light and dark.** `generateThemes(tokens, mode)` takes the mode, so the same
  tokens yield matched light and dark Paper themes.
- **Reach for Paper when you must.** Because the mobile theme is a real Paper MD3
  theme, you can still use Paper's component APIs in a `*.native.tsx` screen — but
  prefer tokens for anything shared across platforms, so web stays in step.

## See also

- [Library overview](../library/overview.md) — the tokens-first design system and
  the component quartet (`Card.native.tsx` is the Paper implementation).
- [Web styling](../web/styling.md) — the same tokens, the MUI side.
- [Mobile overview](./overview.md) — where mobile screens and navigation live.
