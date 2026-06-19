---
sidebar_position: 3
title: Bars & Navigation
---

# Bars & Navigation

Top bars, navigation surfaces and the floating action button.

`BottomNav` and `Drawer` are **mobile-only**: on web they render `null` and emit a dev-only `console.warn("<Name> is mobile-only")`. `AppBar`, `GlassAppBar` and `Fab` render on **both** platforms.

Both navigation components are driven by the shared `NavItem` shape:

```ts
interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: string | number;
}
```

## AppBar — Both

A top app bar with a title, optional subtitle, back button and action slot.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string` | Yes | — | Bar title. |
| `subtitle` | `string` | No | — | Secondary line under the title. |
| `onBack` | `() => void` | No | — | When set, shows a back affordance. |
| `actions` | `ReactNode` | No | — | Trailing action content (e.g. icon buttons). |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { AppBar, Button } from '@sublime-ui/library';

<AppBar
  title="Orders"
  subtitle="32 open"
  onBack={() => nav.turnBack()}
  actions={<Button variant="ghost" icon="filter">Filter</Button>}
/>
```

## GlassAppBar — Both

The translucent glass variant of the top bar. Same surface as `AppBar` plus a `transparent` flag.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `title` | `string` | Yes | — | Bar title. |
| `subtitle` | `string` | No | — | Secondary line under the title. |
| `onBack` | `() => void` | No | — | When set, shows a back affordance. |
| `actions` | `ReactNode` | No | — | Trailing action content. |
| `transparent` | `boolean` | No | — | Fully transparent background (lets content show through). |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { GlassAppBar } from '@sublime-ui/library';

<GlassAppBar title="Gallery" transparent />
```

## BottomNav — Mobile-only

A bottom tab bar. Pass the list of items, the active key, and a select handler.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `items` | `NavItem[]` | Yes | — | Tabs to render. |
| `activeKey` | `string` | Yes | — | Key of the currently selected item. |
| `onSelect` | `(key: string) => void` | Yes | — | Called with the tapped item's key. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { BottomNav } from '@sublime-ui/library';

<BottomNav
  items={[
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'cart', label: 'Cart', icon: 'cart', badge: 3 },
  ]}
  activeKey="home"
  onSelect={setTab}
/>
```

## Drawer — Mobile-only

A slide-in navigation drawer with optional header and footer slots.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `items` | `NavItem[]` | Yes | — | Navigation entries. |
| `activeKey` | `string` | Yes | — | Key of the currently selected item. |
| `onSelect` | `(key: string) => void` | Yes | — | Called with the tapped item's key. |
| `header` | `ReactNode` | No | — | Content above the item list. |
| `footer` | `ReactNode` | No | — | Content below the item list. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Drawer, Text } from '@sublime-ui/library';

<Drawer
  items={[
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'settings', label: 'Settings', icon: 'cog' },
  ]}
  activeKey="home"
  onSelect={go}
  header={<Text variant="title">My App</Text>}
/>
```

## Fab — Both

A floating action button. Provide `label` to render an extended FAB.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `icon` | `string` | Yes | — | Icon name. |
| `onPress` | `() => void` | No | — | Press handler. |
| `tone` | `Tone` | No | `'primary'` | Color tone. |
| `label` | `string` | No | — | When set, renders an extended (labelled) FAB. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Fab } from '@sublime-ui/library';

<Fab icon="plus" label="New" onPress={create} />
```
