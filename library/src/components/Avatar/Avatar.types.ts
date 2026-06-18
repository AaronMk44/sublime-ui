import type { Size } from '../common.js';

export interface AvatarProps {
  /** Image URI; when present the avatar shows the image. */
  source?: string;
  /** Fallback text; initials are derived from it when no source is present. */
  label?: string;
  size?: Size;
  testID?: string;
}
