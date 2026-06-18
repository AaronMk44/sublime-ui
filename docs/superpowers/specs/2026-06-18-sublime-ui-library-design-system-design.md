# Sublime UI — Library Design System (#4) — Design

Date: 2026-06-18
Status: Draft (pending written-spec review)

## 1. Program context

**Sublime UI** is a TypeScript-only, cross-platform application-development
framework. This is sub-project **#4: `@sublime-ui/library` — the design system**:
a set of styled, cross-platform components built on **React Native Paper**
(mobile) and **MUI** (web/desktop), reskinned to a modern, shadcn/Tailwind-
inspired "glass" aesthetic. It depends only on #0 (monorepo foundation) and is
**independent of #2** (framework core), so it is built as a parallel track.
The UI layer (#5) consumes these components to assemble screens.

### The one idea

**Tokens-first.** A single, serializable token config is the source of truth.
A pure function generates both native themes from it; a platform-resolved
provider installs the right one; every component wraps Paper/MUI and reads the
tokens. Define the look once → render it natively through Paper and MUI.

### Prior art it codifies

The Gulani apps already share a `GlassTokens` contract (surfaces, semantic soft
pills, radii, focus) but **theme-first**: each platform defines its native theme
and derives tokens from it, so the Paper and MUI themes have drifted. #4 inverts
this to **tokens-first** (one canonical contract generates both themes) and
unifies the two drifted token sets into one.

## 2. Architecture

```
library/src/
  tokens/
    tokens.ts            # SublimeTokens type + defaultTokens (light + dark), JSON-serializable
    generateThemes.ts    # pure: generateThemes(tokens) -> { paperTheme, muiTheme }
  provider/
    TokenContext.ts      # React context holding the active resolved tokens
    useTokens.ts         # () => SublimeTokens (current mode) — platform-agnostic
    SublimeProvider.tsx          # web: MUI ThemeProvider + CssBaseline + TokenContext
    SublimeProvider.native.tsx   # mobile: Paper Provider + TokenContext
  components/
    Button/
      Button.types.ts    # shared ButtonProps (typed once)
      Button.tsx         # web — MUI implementation
      Button.native.tsx  # mobile — Paper implementation
      index.ts           # re-export
    ... one folder per component (18 total)
  index.ts               # public exports
```

### Platform resolution

- Each component folder ships **three files**: `X.types.ts` (the shared prop
  interface), `X.tsx` (web/MUI — the default tsc/web resolution), and
  `X.native.tsx` (mobile/Paper). Both implementation files import their props
  from `X.types.ts`, so the **API is identical and typed once**.
- A consumer's **Metro** (RN) resolves `./X` → `X.native.tsx`; a consumer's
  **Vite/webpack** resolves → `X.tsx`. The bundler picks the file; the app code
  imports `{ X } from '@sublime-ui/library'` once.
- **`tsc` typechecks every file in `src/`** (not only imported ones), so both
  `X.tsx` and `X.native.tsx` are type-checked against the same `X.types.ts`.
- **Shipping:** the library build must **preserve the `.native`/web file split**
  for the consumer's bundler — i.e. emit per-file output (not a single bundle)
  and set the `package.json` `react-native` field to the source/native entry so
  Metro resolves platform files. (Build-config task in the plan.)

## 3. Token contract (`SublimeTokens`) — serializable

Designed to be plain JSON so the future devkit-server theme customizer can load,
edit, and hot-swap it. Color tokens vary by mode; scales are mode-invariant.

```ts
export interface ColorTokens {
  // brand
  primary: string; primaryFg: string;
  secondary: string; secondaryFg: string;
  // semantic
  success: string; warning: string; danger: string; info: string;
  // surfaces / structure
  background: string; foreground: string; mutedFg: string;
  surface: string; surfaceBorder: string; surfaceHover: string;
  glassBg: string; glassBorder: string; divider: string;
  // focus
  ring: string;
  // soft semantic pairs (bg + fg) for pills/badges/banners
  primarySoftBg: string; primarySoftFg: string;
  successSoftBg: string; successSoftFg: string;
  warningSoftBg: string; warningSoftFg: string;
  dangerSoftBg: string;  dangerSoftFg: string;
  infoSoftBg: string;    infoSoftFg: string;
}

export interface SublimeTokens {
  color: { light: ColorTokens; dark: ColorTokens };
  radii: { sm: number; md: number; lg: number; full: number };
  shadows: { sm: string; md: string; lg: string };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  typography: {
    family: string;
    sizes: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number };
    weights: { regular: number; medium: number; semibold: number; bold: number };
  };
}

export const defaultTokens: SublimeTokens; // the shipped glass theme (light + dark)
```

## 4. Theme generation (the customizer seam)

```ts
export function generateThemes(
  tokens: SublimeTokens,
  mode: 'light' | 'dark',
): { paperTheme: MD3Theme; muiTheme: Theme };
```

- **Pure** — no globals, no side effects; fully unit-testable. Maps tokens →
  a Paper `MD3Theme` (colors, roundness from `radii`) and an MUI `Theme`
  (`palette`, `shape.borderRadius`, `typography`, `cssVariables` for scheme).
- This is exactly the function a future **devkit-server** drives: edit a
  `tokens.json`, call `generateThemes`, preview live; bake the chosen tokens at
  build time. No library change needed to support customization.

## 5. Provider & consumption

```tsx
import { SublimeProvider } from '@sublime-ui/library';

<SublimeProvider mode="light" /* tokens={customTokens} */>
  {app}
</SublimeProvider>
```

- **Web** (`SublimeProvider.tsx`): wraps MUI `ThemeProvider` + `CssBaseline`,
  and a `TokenContext.Provider` carrying the active `ColorTokens` + scales.
- **Mobile** (`SublimeProvider.native.tsx`): wraps Paper `Provider` with the
  generated `MD3Theme`, plus the same `TokenContext.Provider`.
- `useTokens()` returns the active resolved tokens (current mode) for custom
  styling inside components and app code.
- `tokens` defaults to `defaultTokens`; passing custom tokens overrides them —
  the seam the devkit-server will eventually drive. `mode` selects light/dark.

## 6. Component conventions

Every one of the 20 components:
- has `X.types.ts` (shared prop interface) imported by both platform files →
  **identical API**;
- shares common props where meaningful: `variant` (`solid | soft | outline |
  ghost`), `tone` (`primary | success | danger | warning | info | neutral`),
  `size` (`sm | md | lg`), plus a per-platform style escape hatch (`sx` on web,
  `style` on native);
- defaults to the **glass aesthetic** derived from tokens (not raw Paper/MUI
  defaults);
- is self-contained and independently testable (the unit of the #4 fan-out).

### Mobile-only components

`BottomNav` and `Drawer` are **mobile-only**. To preserve the single-import
model and type safety, each still ships three files:
- `X.types.ts` — the shared props;
- `X.native.tsx` — the real Paper/RN implementation;
- `X.tsx` (web) — a **stub** that renders `null` and emits a dev-only warning
  (`"<X> is mobile-only and renders nothing on web"`).

So shared screen code can reference them without crashing on web (they no-op),
and types stay enforced. They are **presentation-only and navigation-agnostic**:
they render the glass bar / drawer panel given `items`, an `activeKey`, and
`onSelect` — the app plugs them into its navigation (e.g. React Navigation's
`tabBar` / `drawerContent` render props). **React Navigation is NOT a library
dependency.** Shared nav item shape: `interface NavItem { key: string; label:
string; icon: string; badge?: string | number }`; `Drawer` additionally accepts
optional `header` and `footer` slots.

### The 20 components

Cross-platform (web + mobile):

| # | Component | Mobile (Paper) base | Web (MUI) base |
|---|---|---|---|
| 1 | Button | `Button` | `Button` |
| 2 | Text | `Text` | `Typography` |
| 3 | Input | `TextInput` | `TextField` |
| 4 | Card | `Surface`/`Card` | `Paper`/`Card` |
| 5 | Badge | `Badge`/custom | `Chip`/custom |
| 6 | Icon | `Icon` | icon slot |
| 7 | Surface | `Surface` | `Box`/`Paper` |
| 8 | Divider | `Divider` | `Divider` |
| 9 | Spinner | `ActivityIndicator` | `CircularProgress` |
| 10 | Dialog/Modal | `Portal`+`Dialog` | `Dialog` |
| 11 | Banner/Alert | `Banner`/custom | `Alert` |
| 12 | Fab | `FAB` | `Fab` |
| 13 | AppBar/Header | `Appbar` | `AppBar`/`Toolbar` |
| 14 | Select | `Menu`/custom | `Select`/`MenuItem` |
| 15 | Avatar | `Avatar` | `Avatar` |
| 16 | Tooltip | `Tooltip` | `Tooltip` |
| 17 | Checkbox | `Checkbox` | `Checkbox` |
| 18 | Switch | `Switch` | `Switch` |

Mobile-only (web = stub):

| # | Component | Mobile (Paper/RN) base | Web |
|---|---|---|---|
| 19 | BottomNav | styled bar over Paper primitives | stub (renders null) |
| 20 | Drawer | custom glass drawer panel (per Gulani `StoreDrawerContent`) | stub (renders null) |

`Icon` wraps an icon *slot/name* prop — the library does **not** bundle an icon
set (the app supplies icons via Paper's icon system / an MUI icon node).

## 7. Dependencies

- **Peer (app-provided):** `react`, `react-native`, `react-native-paper`,
  `@mui/material`, `@emotion/react`, `@emotion/styled`. Marked optional in
  `peerDependenciesMeta` so a web-only app need not install the RN peers and
  vice versa (the bundler never resolves the other platform's files).
- **Dev (build/test):** the above + `@testing-library/react`, `jsdom`,
  `react-dom`, `@types/react`, `react-test-renderer` (native render checks).

## 8. Testing

- **Pure layers — full TDD:** `tokens` (shape, light/dark completeness),
  `generateThemes` (token → Paper/MUI mapping; e.g. `radii.md` → `roundness`/
  `shape.borderRadius`; semantic colors land in the right palette slots).
- **Web components — render smoke tests:** jsdom + `@testing-library/react`
  (as in #2), rendered inside `SublimeProvider`; assert the variant/tone/size
  props produce the expected role/text/state (not pixel snapshots).
- **Native components — lighter check:** typecheck (tsc covers every
  `.native.tsx`) plus a minimal `react-test-renderer` render that the component
  mounts under the Paper provider without throwing. Full RN visual testing is
  heavy and is a **documented limitation** to deepen later.
- A `Button` reference component is taken end-to-end on **both** platforms as
  the integration proof before the remaining components fan out.

## 9. Scope & future (YAGNI)

**In #4 v1:** the token contract + `defaultTokens` (light+dark), `generateThemes`,
`SublimeProvider` (+`useTokens`), and the 20 components above (18 cross-platform
+ `BottomNav`/`Drawer` mobile-only with web stubs) with the glass default.
Platform-resolved delivery that a consumer's Metro/Vite can bundle.

**Out of scope (future):**
- **devkit-server theme customizer** — a visual editor that drives `tokens`
  live. Roadmap item (a future sub-project or a devkit `theme` command). #4's
  serializable token contract + pure `generateThemes` are built to feed it.
- Animation/motion system, gesture handling.
- Form-validation wiring (that is framework #2's data layer, not the library).
- Bundling an icon set (the `Icon` component wraps a slot/name).
- Compound/layout components (Grid, Stack beyond `Surface`), data table, charts.
- Theming beyond light/dark (multi-brand) — enabled by tokens but not shipped.

## 10. Acceptance criteria

- `SublimeProvider` renders on web (MUI) and mobile (Paper) and supplies tokens
  via `useTokens()`; `mode` toggles light/dark.
- `generateThemes(defaultTokens, mode)` returns a valid Paper `MD3Theme` and MUI
  `Theme` (unit-tested mapping).
- All 20 components exist with a shared `X.types.ts` behind one
  `@sublime-ui/library` import: 18 with a web (`X.tsx`) + mobile (`X.native.tsx`)
  implementation, and `BottomNav`/`Drawer` with a mobile impl + a web stub that
  renders null and dev-warns. Each cross-platform component honors
  `variant`/`tone`/`size` where applicable and defaults to glass.
- Web components pass render smoke tests; every file typechecks; native
  components (incl. the two mobile-only) mount under the Paper provider; the web
  stubs render null without throwing.
- `npm run typecheck`, `lint`, `test`, `build` green across the monorepo; the
  build preserves the `.native`/web split for consumer bundlers.
