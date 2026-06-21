---
title: AppBar
sidebar_position: 1
---

# AppBar

A top navigation bar for a screen — it shows the current title, an optional subtitle, an optional back button, and a slot for trailing actions.

Renders on web via MUI and on mobile via React Native Paper from a single import.

On mobile this is also the **default navigation header**: `sublime build:nav`
wires it into every generated navigator automatically (title from the page's
`title`, back arrow shown only when there's somewhere to go back). You rarely
construct it by hand for navigation — see
[Storybook Navigation → Mobile header](/docs/navigation/storybook#mobile-header-appbar).
Use it directly when you need a standalone bar or a custom header (`header: false`).

## Usage

```tsx
import { AppBar } from '@sublime-ui/library';

export default function AppBarExample() {
  return <AppBar title="Inbox" />;
}
```

## Examples

### With a subtitle

Pass `subtitle` to show a secondary line under the title — handy for context like a count or a section name.

```tsx
import { AppBar } from '@sublime-ui/library';

export default function AppBarSubtitleExample() {
  return <AppBar title="Inbox" subtitle="12 unread" />;
}
```

### With a back button

Provide `onBack` to render a leading back affordance. The handler fires when the user taps it (the back arrow on mobile, the back `IconButton` on web).

```tsx
import { AppBar } from '@sublime-ui/library';

export default function AppBarBackExample() {
  const handleBack = () => console.log('navigate back');

  return <AppBar title="Message detail" onBack={handleBack} />;
}
```

### With trailing actions

The `actions` slot accepts any `ReactNode`, so you can drop in one or more controls — here a Sublime UI `Button` — aligned to the end of the bar.

```tsx
import { AppBar, Button } from '@sublime-ui/library';

export default function AppBarActionsExample() {
  return (
    <AppBar
      title="Drafts"
      actions={
        <Button variant="ghost" tone="primary" icon="plus" onPress={() => {}}>
          New
        </Button>
      }
    />
  );
}
```

### Detail screen with everything

A typical detail-view header: a back button, a title with a subtitle, and a trailing action all at once.

```tsx
import { useState } from 'react';
import { AppBar, Button } from '@sublime-ui/library';

export default function AppBarDetailExample() {
  const [saved, setSaved] = useState(false);

  return (
    <AppBar
      title="Edit profile"
      subtitle={saved ? 'All changes saved' : 'Unsaved changes'}
      onBack={() => console.log('navigate back')}
      actions={
        <Button variant="solid" tone="primary" onPress={() => setSaved(true)}>
          Save
        </Button>
      }
    />
  );
}
```

### Multiple actions

Because `actions` is a `ReactNode`, you can pass a fragment with several controls to build a richer toolbar.

```tsx
import { AppBar, Button } from '@sublime-ui/library';

export default function AppBarMultipleActionsExample() {
  const noop = () => {};

  return (
    <AppBar
      title="Document"
      onBack={noop}
      actions={
        <>
          <Button variant="ghost" tone="neutral" icon="share" onPress={noop}>
            Share
          </Button>
          <Button variant="solid" tone="primary" icon="check" onPress={noop}>
            Publish
          </Button>
        </>
      }
    />
  );
}
```

### With a test identifier

Set `testID` to target the bar in tests; it is exposed as `data-testid` on web and `testID` on mobile.

```tsx
import { AppBar } from '@sublime-ui/library';

export default function AppBarTestIdExample() {
  return <AppBar title="Settings" testID="settings-appbar" />;
}
```

## Props

### title

**Type:** `string`
**Default:** —
**Required:** Yes

The primary heading shown in the bar. Truncates with an ellipsis when it overflows.

### subtitle

**Type:** `string`
**Default:** —
**Required:** No

An optional secondary line rendered beneath the title.

### onBack

**Type:** `() => void`
**Default:** —
**Required:** No

When provided, a leading back control is rendered and this handler is called when it is pressed. Omit it to hide the back affordance.

### actions

**Type:** `ReactNode`
**Default:** —
**Required:** No

Content rendered at the trailing end of the bar, typically one or more buttons or icon buttons.

### testID

**Type:** `string`
**Default:** —
**Required:** No

Test identifier, surfaced as `data-testid` on web and `testID` on mobile.

## See also

- [GlassAppBar](/components/bars-nav/GlassAppBar)
- [BottomNav](/components/bars-nav/BottomNav)
- [Drawer](/components/layout/Drawer)
