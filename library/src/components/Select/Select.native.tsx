import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Menu, TextInput } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { SelectProps } from './Select.types.js';

export function Select({
  value, onChange, options, label, placeholder, disabled, testID,
}: SelectProps) {
  const tokens = useTokens();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? '';
  return (
    <View {...(testID !== undefined ? { testID } : {})}>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        contentStyle={{
          backgroundColor: tokens.color.glassBg,
          borderColor: tokens.color.glassBorder,
          borderWidth: 1,
          borderRadius: tokens.radii.md,
        }}
        anchor={
          <Pressable
            onPress={() => {
              if (!disabled) setOpen(true);
            }}
          >
            <TextInput
              mode="outlined"
              editable={false}
              pointerEvents="none"
              disabled={!!disabled}
              value={display}
              {...(label !== undefined ? { label } : {})}
              {...(placeholder !== undefined ? { placeholder } : {})}
              outlineColor={tokens.color.surfaceBorder}
              right={<TextInput.Icon icon="menu-down" />}
              style={{ borderRadius: tokens.radii.md }}
            />
          </Pressable>
        }
      >
        {options.length === 0 ? (
          <Menu.Item disabled title="No options" />
        ) : (
          options.map((opt) => (
            <Menu.Item
              key={opt.value}
              title={opt.label}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))
        )}
      </Menu>
    </View>
  );
}
