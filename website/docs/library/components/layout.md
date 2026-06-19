---
sidebar_position: 2
title: Layout & Surfaces
---

# Layout & Surfaces

Containers and separators that structure a screen. All render on both web and mobile.

## Surface

An elevated, glass-styled container. The base building block for grouped content.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | Yes | — | Surface contents. |
| `elevation` | `'none' \| 'sm' \| 'md' \| 'lg'` | No | `'sm'` | Shadow / glass depth. |
| `padded` | `boolean` | No | — | Adds interior padding. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Surface, Text } from '@sublime-ui/library';

<Surface elevation="md" padded>
  <Text variant="subtitle">Account summary</Text>
</Surface>
```

## Card

A tappable content card. Padded by default; pass `onPress` to make it interactive.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | Yes | — | Card contents. |
| `onPress` | `() => void` | No | — | Makes the card pressable. |
| `padded` | `boolean` | No | `true` | Interior padding. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Card, Text } from '@sublime-ui/library';

<Card onPress={() => openProduct(id)}>
  <Text variant="subtitle">Wireless Headphones</Text>
  <Text tone="neutral">$129.00</Text>
</Card>
```

## Divider

A thin separator line, horizontal by default.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `vertical` | `boolean` | No | — | Render a vertical rule instead of horizontal. |
| `inset` | `boolean` | No | — | Indent the divider from the leading edge. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Divider } from '@sublime-ui/library';

<Divider inset />
```
