export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  testID?: string;
}
