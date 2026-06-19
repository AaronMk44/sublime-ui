---
sidebar_position: 5
title: Feedback & Overlays
---

# Feedback & Overlays

Modals, inline messages, loading indicators and tooltips. All render on both web and mobile.

For transient, app-wide messages (snackbar on mobile, toast on web), use the [`useNotify`](#usenotify) hook instead of these components.

## Dialog

A controlled modal dialog with a title, body and action slot.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `open` | `boolean` | Yes | — | Whether the dialog is visible. |
| `onClose` | `() => void` | Yes | — | Called on backdrop / dismiss request. |
| `title` | `string` | No | — | Dialog heading. |
| `children` | `ReactNode` | Yes | — | Dialog body. |
| `actions` | `ReactNode` | No | — | Footer action content (e.g. buttons). |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Dialog, Button, Text } from '@sublime-ui/library';

<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Delete item?"
  actions={
    <>
      <Button variant="ghost" onPress={() => setOpen(false)}>Cancel</Button>
      <Button tone="danger" onPress={confirmDelete}>Delete</Button>
    </>
  }
>
  <Text>This action cannot be undone.</Text>
</Dialog>
```

## Banner

An inline, toned message with optional title, action and close button.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `tone` | `Tone` | No | `'info'` | Color tone. |
| `title` | `string` | No | — | Banner heading. |
| `children` | `ReactNode` | Yes | — | Banner body. |
| `onClose` | `() => void` | No | — | When set, shows a close affordance. |
| `action` | `ReactNode` | No | — | Trailing action content. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Banner } from '@sublime-ui/library';

<Banner tone="warning" title="Offline" onClose={dismiss}>
  Changes will sync when you reconnect.
</Banner>
```

## Spinner

An indeterminate loading indicator.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Indicator size. |
| `tone` | `Tone` | No | `'primary'` | Color tone. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Spinner } from '@sublime-ui/library';

<Spinner size="lg" tone="primary" />
```

## Tooltip

A label shown on hover (web) or long-press (mobile), wrapping a single element.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | `string` | Yes | — | Tooltip text. |
| `children` | `ReactElement` | Yes | — | The single element the tooltip wraps. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Tooltip, Button } from '@sublime-ui/library';

<Tooltip label="Refresh data">
  <Button variant="ghost" icon="refresh" onPress={refresh}>Refresh</Button>
</Tooltip>
```

## useNotify

For transient messages, call `useNotify()`. The same call shows a snackbar on mobile and a toast on web, rendered by the per-platform `NotificationHost` that `<SublimeProvider>` mounts.

```tsx
import { useNotify } from '@sublime-ui/library';

function SaveButton() {
  const notify = useNotify();
  return (
    <Button onPress={async () => {
      await save();
      notify.success('Saved');
    }}>
      Save
    </Button>
  );
}
```

The hook returns:

| Member | Signature | Description |
| --- | --- | --- |
| `notify` | `(message: string, opts?: NotifyOptions) => string` | Show a message; returns its id. |
| `dismiss` | `(id: string) => void` | Dismiss a message by id. |
| `success` | `(message: string, opts?: NotifyOptions) => string` | Shorthand with `tone: 'success'`. |
| `error` | `(message: string, opts?: NotifyOptions) => string` | Shorthand with `tone: 'error'`. |
| `warning` | `(message: string, opts?: NotifyOptions) => string` | Shorthand with `tone: 'warning'`. |
| `info` | `(message: string, opts?: NotifyOptions) => string` | Shorthand with `tone: 'info'`. |

`NotifyOptions` is `{ tone?, duration?, action? }`, where `tone` is one of `'success' | 'error' | 'warning' | 'info' | 'neutral'` (default `'neutral'`), `duration` is in milliseconds (default `4000`), and `action` is `{ label: string; onPress: () => void }`.
