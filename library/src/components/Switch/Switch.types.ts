import type { Tone } from '../common.js';

export interface SwitchProps {
  /** Whether the switch is on. */
  value: boolean;
  /** Called with the new value when toggled. */
  onValueChange: (value: boolean) => void;
  /** Optional label rendered beside the switch. */
  label?: string;
  /** Disables interaction. */
  disabled?: boolean;
  /** Color tone applied to the on state. */
  tone?: Tone;
  testID?: string;
}
