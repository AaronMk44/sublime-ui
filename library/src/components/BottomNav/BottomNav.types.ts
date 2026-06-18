import type { NavItem } from '../common.js';

export interface BottomNavProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  testID?: string;
}
