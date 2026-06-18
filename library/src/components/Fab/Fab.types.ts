import type { Tone } from '../common.js';

export interface FabProps {
  icon: string;
  onPress?: () => void;
  tone?: Tone;
  label?: string;
  testID?: string;
}
