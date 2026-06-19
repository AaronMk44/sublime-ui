---
sidebar_position: 1
title: Core Components
---

# Core Components

`@sublime-ui/library` ships a set of 21 shared, cross-platform UI components. You write against one component and one props type; the bundler resolves the right implementation per platform at build time — **real MUI on web, React Native Paper on mobile**. There is no custom render engine and no webview: each platform draws with its own native-feeling toolkit.

## The component model

- **One import, platform-resolved at build.** Every component is authored as a quartet inside `library/src/components/<Name>/`:
  - `<Name>.tsx` — the web implementation (MUI).
  - `<Name>.native.tsx` — the mobile implementation (Paper).
  - `<Name>.types.ts` — the **shared** props interface both implementations satisfy.
  - `index.ts` — the export barrel.

  You always `import { Button } from '@sublime-ui/library'`; the bundler picks `.tsx` or `.native.tsx`.

- **Shared props.** Because both implementations satisfy the same `<Name>.types.ts`, a component's prop names and types are identical on every platform. The examples below use those real prop names.

- **Glass aesthetic.** The default look is a soft, translucent "glass" surface style, most visible in `Surface`, `Card`, `GlassAppBar`, and the overlay components.

- **`<SublimeProvider>` is required.** Components read theme tokens from context. Wrap your app once:

  ```tsx
  import { SublimeProvider } from '@sublime-ui/library';

  export function App() {
    return (
      <SublimeProvider mode="light">
        {/* your screens */}
      </SublimeProvider>
    );
  }
  ```

  `SublimeProvider` accepts `mode?: 'light' | 'dark'` (default `'light'`), an optional `tokens?: SublimeTokens` object (defaults to `defaultTokens`), and `children`. It mounts the theme, a `CssBaseline`/Paper theme, and the per-platform `NotificationHost`.

- **`useTokens()`.** Inside any component you can read the resolved theme tokens:

  ```tsx
  import { useTokens } from '@sublime-ui/library';

  function Price() {
    const tokens = useTokens();
    return <span style={{ color: tokens.colors.primary }}>$9.99</span>;
  }
  ```

  Calling `useTokens()` outside a `<SublimeProvider>` throws.

## Shared variant / tone / size props

Several components draw from a small set of shared union types declared in `library/src/components/common.ts`:

| Type | Values |
| --- | --- |
| `Variant` | `'solid'` · `'soft'` · `'outline'` · `'ghost'` |
| `Tone` | `'primary'` · `'success'` · `'danger'` · `'warning'` · `'info'` · `'neutral'` |
| `Size` | `'sm'` · `'md'` · `'lg'` |

A `NavItem` shape — `{ key, label, icon, badge? }` — is shared by the navigation components.

> Note: the notification tones (used by `useNotify`) are a separate set: `'success' | 'error' | 'warning' | 'info' | 'neutral'`. A few components also declare their own local variants (for example `Badge` adds a `'muted'` variant and `Text` uses `'title' | 'subtitle' | 'body' | 'caption'`).

Every component also accepts an optional `testID?: string` for test targeting.

## Platform availability

Most components render on both web and mobile. Two are **mobile-only**: `BottomNav` and `Drawer`. On web they render `null` and emit a dev-only `console.warn` (`"<Name> is mobile-only"`), so importing them is safe but they draw nothing. `AppBar` and `GlassAppBar` exist on **both** platforms.

## All components

### Layout & Surfaces

| Component | Platforms | Description |
| --- | --- | --- |
| `Surface` | Both | Elevated, glass-styled container with tunable elevation. |
| `Card` | Both | Tappable content card with optional padding. |
| `Divider` | Both | Thin horizontal or vertical separator line. |

### Bars & Navigation

| Component | Platforms | Description |
| --- | --- | --- |
| `AppBar` | Both | Top app bar with title, optional back button and actions. |
| `GlassAppBar` | Both | Translucent glass variant of the top app bar. |
| `BottomNav` | Mobile-only | Bottom tab navigation bar driven by `NavItem`s. |
| `Drawer` | Mobile-only | Slide-in navigation drawer with header/footer slots. |
| `Fab` | Both | Floating action button, optionally extended with a label. |

### Inputs & Forms

| Component | Platforms | Description |
| --- | --- | --- |
| `Button` | Both | Pressable button with variant, tone, size, loading and icon. |
| `Input` | Both | Single- or multi-line text field with label and error. |
| `Select` | Both | Dropdown selector over a list of options. |
| `Checkbox` | Both | Boolean checkbox with optional label. |
| `Switch` | Both | Boolean on/off toggle with optional label. |

### Feedback & Overlays

| Component | Platforms | Description |
| --- | --- | --- |
| `Dialog` | Both | Modal dialog with title, body and action slot. |
| `Banner` | Both | Inline toned message with optional title, action and close. |
| `Spinner` | Both | Indeterminate loading indicator. |
| `Tooltip` | Both | Hover / long-press label wrapping a single element. |

### Data Display

| Component | Platforms | Description |
| --- | --- | --- |
| `Text` | Both | Themed typography with title/subtitle/body/caption variants. |
| `Icon` | Both | Named (or custom node) icon with size and color. |
| `Avatar` | Both | Image or initials avatar in three sizes. |
| `Badge` | Both | Small toned label / count chip. |

See the per-group reference pages for the full prop tables, defaults and usage examples.
