---
sidebar_position: 6
title: Data Display
---

# Data Display

Typography, icons, avatars and badges. All render on both web and mobile.

## Text

Themed typography. Variants map to the type scale; `tone` colors the text.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | Yes | — | Text content. |
| `variant` | `'title' \| 'subtitle' \| 'body' \| 'caption'` | No | `'body'` | Typography role. |
| `tone` | `Tone` | No | — | Color tone. |
| `numberOfLines` | `number` | No | — | Truncate after N lines. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Text } from '@sublime-ui/library';

<Text variant="title">Dashboard</Text>
<Text tone="neutral" numberOfLines={2}>
  A longer description that truncates after two lines.
</Text>
```

## Icon

A named icon. You may instead supply a custom `node`. Size accepts a `Size` token or a raw pixel number; color accepts a token color key or any CSS color string.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | `string` | Yes | — | Icon name. |
| `node` | `ReactNode` | No | — | Custom icon node (overrides `name`'s default rendering). |
| `size` | `number \| 'sm' \| 'md' \| 'lg'` | No | — | Pixel size or size token. |
| `color` | `keyof ColorTokens \| string` | No | — | Token color key (e.g. `'primary'`) or any color string. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Icon } from '@sublime-ui/library';

<Icon name="bell" size="md" color="primary" />
```

## Avatar

An image or initials avatar. When `source` is set it shows the image; otherwise initials are derived from `label`.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `source` | `string` | No | — | Image URI; when present the image is shown. |
| `label` | `string` | No | — | Fallback text; initials are derived from it. |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Avatar size. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Avatar } from '@sublime-ui/library';

<Avatar source="https://example.com/jane.png" label="Jane Doe" />
<Avatar label="Jane Doe" size="lg" />
```

## Badge

A small toned label or count chip. Note that `Badge` declares its **own** `variant` set (it adds `'muted'` and does not use the shared `Variant` union).

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | `string` | Yes | — | Badge text. |
| `tone` | `Tone` | No | `'neutral'` | Color tone. |
| `variant` | `'solid' \| 'soft' \| 'muted'` | No | `'soft'` | Visual style. |
| `icon` | `string` | No | — | Leading icon name. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Badge } from '@sublime-ui/library';

<Badge label="New" tone="success" variant="solid" />
<Badge label="3" tone="danger" icon="bell" />
```
