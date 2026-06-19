---
sidebar_position: 4
title: Inputs & Forms
---

# Inputs & Forms

Interactive controls. All render on both web and mobile and follow controlled-component conventions (you own the value, the component reports changes).

## Button

A pressable button with shared `Variant` / `Tone` / `Size`, plus loading and icon support.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `children` | `ReactNode` | Yes | — | Button label. |
| `onPress` | `() => void` | No | — | Press handler. |
| `variant` | `'solid' \| 'soft' \| 'outline' \| 'ghost'` | No | `'solid'` | Visual style. |
| `tone` | `Tone` | No | `'primary'` | Color tone. |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Control size. |
| `disabled` | `boolean` | No | — | Disables interaction. |
| `loading` | `boolean` | No | — | Shows a spinner and blocks presses. |
| `icon` | `string` | No | — | Leading icon name. |
| `fullWidth` | `boolean` | No | — | Stretches to the container width. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Button } from '@sublime-ui/library';

<Button variant="solid" tone="primary" icon="check" onPress={save}>
  Save
</Button>
```

## Input

A single- or multi-line text field with label and inline error.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | `string` | Yes | — | Current text value. |
| `onChangeText` | `(text: string) => void` | Yes | — | Called with the new text. |
| `label` | `string` | No | — | Field label. |
| `placeholder` | `string` | No | — | Placeholder text. |
| `error` | `string` | No | — | Inline error message (also styles the field). |
| `disabled` | `boolean` | No | — | Disables editing. |
| `secureTextEntry` | `boolean` | No | — | Masks input (passwords). |
| `multiline` | `boolean` | No | — | Renders a multi-line text area. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Input } from '@sublime-ui/library';

<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="you@example.com"
  error={emailError}
/>
```

## Select

A dropdown selector over a list of `{ value, label }` options.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | `string` | Yes | — | Selected option value. |
| `onChange` | `(value: string) => void` | Yes | — | Called with the chosen value. |
| `options` | `SelectOption[]` | Yes | — | Available options (`{ value, label }`). |
| `label` | `string` | No | — | Field label. |
| `placeholder` | `string` | No | — | Shown when nothing is selected. |
| `disabled` | `boolean` | No | — | Disables the control. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Select } from '@sublime-ui/library';

<Select
  label="Role"
  value={role}
  onChange={setRole}
  options={[
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
  ]}
/>
```

## Checkbox

A controlled boolean checkbox with an optional label.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `checked` | `boolean` | Yes | — | Whether the checkbox is checked. |
| `onChange` | `(checked: boolean) => void` | Yes | — | Called with the new checked value. |
| `label` | `string` | No | — | Label rendered beside the checkbox. |
| `disabled` | `boolean` | No | — | Disables interaction. |
| `tone` | `Tone` | No | `'primary'` | Color tone for the checked state. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Checkbox } from '@sublime-ui/library';

<Checkbox checked={agree} onChange={setAgree} label="I agree to the terms" />
```

## Switch

A controlled on/off toggle with an optional label.

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | `boolean` | Yes | — | Whether the switch is on. |
| `onValueChange` | `(value: boolean) => void` | Yes | — | Called with the new value. |
| `label` | `string` | No | — | Label rendered beside the switch. |
| `disabled` | `boolean` | No | — | Disables interaction. |
| `tone` | `Tone` | No | `'primary'` | Color tone for the on state. |
| `testID` | `string` | No | — | Test identifier. |

```tsx
import { Switch } from '@sublime-ui/library';

<Switch value={notifications} onValueChange={setNotifications} label="Notifications" />
```
