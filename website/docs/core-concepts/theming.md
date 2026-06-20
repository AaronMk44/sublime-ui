---
title: Theming
sidebar_position: 6
---

# Theming

Your app's look is driven by **one serializable object** of design tokens — a
`SublimeTokens` set describing your brand's colors, spacing, radii, and
typography. That single object is the source of truth for **both** platforms: it
generates the [MUI](https://mui.com) theme on web and the
[React Native Paper](https://callstack.github.io/react-native-paper/) (MD3) theme
on mobile. You don't hand-write a Paper theme and a separate MUI theme; you write
tokens, and the matching platform themes are derived for you.

## Tokens-first, not style code

The mental shift is that you stop styling components and start declaring tokens.
Because both platform themes come from the same `SublimeTokens`, `tone="danger"`
is the same red whether the pixel is painted by MUI or by Paper — by
construction, not by you keeping two theme files in sync.

## Change tokens once

When you want a different brand color, a tighter spacing scale, or a new corner
radius, you edit your tokens in one place (the shared `src/theme/`). Both the web
theme and the mobile theme update from that one edit — there is no second place
to change, and the platforms can't drift apart. Light and dark modes fall out of
the same tokens too.

## Go deeper

- **[Library overview](/docs/library/overview)** — the tokens-first design
  system, `SublimeTokens`, and `<SublimeProvider>`.
- **[Web styling](/docs/web/styling)** — how tokens become the MUI theme on web.
- **[Mobile theming](/docs/mobile/theming)** — how the same tokens become the
  Paper MD3 theme on mobile.
