import type { Tone } from '../common.js';

export interface CheckboxProps {
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** Called with the new checked value when toggled. */
  onChange: (checked: boolean) => void;
  /** Optional label rendered beside the checkbox. */
  label?: string;
  /** Disables interaction. */
  disabled?: boolean;
  /** Color tone applied to the checked state. */
  tone?: Tone;
  testID?: string;
}
