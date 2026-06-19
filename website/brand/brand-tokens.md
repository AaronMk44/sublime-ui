# Sublime UI — Brand Tokens ("Strata")

Extracted from the Strata logo + landing-page design. The docs site applies a
subset (see **Status**); the rest are reserved for the landing page and the
framework's own `theme/tokens.json`. Sublime UI is tokens-first, so this table is
the seed for that token file.

## Color

| Token | Hex | Role | Status |
| --- | --- | --- | --- |
| amber | `#E07A0B` | brand primary (ribbon, CTAs) | ✅ site + landing |
| amber-dark | `#C76A08` | primary on white (AA) | ✅ light theme primary |
| amber-light | `#F2A33A` | accent, dark-theme primary | ✅ dark theme + selection |
| amber-deep | `#A0561A` | eyebrow / mono labels | ✅ landing |
| amber-on-dark | `#C98A3C` | accent on ink | ✅ landing |
| cream | `#F4EBD8` | logo tile | ✅ logo/favicon |
| cream-light | `#F8F1E2` | tile (hero variant) | ⬜ pending |
| cream-lighter | `#FBF4E6` | surfaces, chips | ✅ site + landing |
| cream-ribbon | `#FBF3E2` | inverted ribbon | ✅ landing (inverted mark) |
| ink | `#1E1B16` | headings, body ink | ✅ site + landing |
| ink-deepest | `#15130F` | dark bg, code cards | ✅ dark theme + landing |
| ink-alt | `#232019` | dark gradient, code bg | ✅ dark code bg |
| off-white | `#F7F3EA` | text on ink | ✅ dark headings |
| gray-700 | `#5A5750` | body secondary | ✅ landing |
| gray-600 | `#6B675F` | muted text | ✅ site + landing |
| gray-500 | `#857F73` | captions | ✅ landing |
| gray-400 | `#A99F8C` | faint labels | ✅ dark secondary |
| page-bg | `#E7E8EB` | landing canvas | ✅ landing |
| border-warm | `#EBDCC0` | chip/card borders | ✅ landing |
| border-cool | `#E2E0DA` `#F0EEE9` | dividers | ✅ landing |

## Type

| Token | Family | Weights | Status |
| --- | --- | --- | --- |
| display / headings | **Sora** | 700, 800 | ✅ |
| body | **Manrope** | 400–700 | ✅ |
| mono / labels | **IBM Plex Mono** | 400–600 | ✅ |

## Geometry & effects

| Token | Value | Status |
| --- | --- | --- |
| squircle radius | 24 / 100-grid | ✅ logo |
| ribbon stroke | 16.5, miter, miterlimit 3 | ✅ logo |
| ribbon points | `67,24 33,40 67,60 33,76` | ✅ logo |
| card radius | 18–24px | ✅ landing |
| heading tracking | -0.02 to -0.035em | ✅ |
| eyebrow tracking | 0.14em uppercase | ✅ landing |
| soft shadow | `0 16px 40px -28px rgba(20,28,48,.22)` | ✅ landing |

## Where applied

- **Docs site theme** — `website/src/css/custom.css` (Infima variable mapping)
- **Logo / favicon** — `website/static/img/{logo,favicon}.svg`
- **Landing page** — `website/src/pages/index.tsx`
- **Fonts** — loaded via `stylesheets` in `website/docusaurus.config.ts`
- **Pending → next** — seed `theme/tokens.json` (app design tokens) from this table.
