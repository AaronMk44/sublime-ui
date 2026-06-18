import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Card } from '../../src/components/Card/index.js';

describe('Card (web)', () => {
  it('renders its children', () => {
    renderWeb(createElement(Card, { children: 'Account' }));
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('fires onPress when pressable and clicked', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Card, { onPress, children: 'Open' }));
    fireEvent.click(screen.getByText('Open'));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
