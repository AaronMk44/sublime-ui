import { View } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import { useTokens } from '../../provider/useTokens.js';
import type { InputProps } from './Input.types.js';

export function Input({
  value, onChangeText, label, placeholder, error,
  disabled, secureTextEntry, multiline, testID,
}: InputProps) {
  const tokens = useTokens();
  return (
    <View>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        {...(label !== undefined ? { label } : {})}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(testID !== undefined ? { testID } : {})}
        error={!!error}
        disabled={!!disabled}
        secureTextEntry={!!secureTextEntry}
        multiline={!!multiline}
        outlineColor={tokens.color.surfaceBorder}
        style={{ borderRadius: tokens.radii.md }}
      />
      {error !== undefined ? (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}
