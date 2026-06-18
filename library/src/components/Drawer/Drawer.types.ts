import type { ReactNode } from 'react';
import type { NavItem } from '../common.js';

export interface DrawerProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
  testID?: string;
}
