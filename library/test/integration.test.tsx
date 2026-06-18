import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../src/test-utils/renderWeb.js';
import { Card, Button, Text, Badge, useNotify } from '../src/index.js';

function Panel() {
  const { success } = useNotify();
  return createElement(Card, { children: [
    createElement(Text, { key: 't', children: 'Account' }),
    createElement(Badge, { key: 'b', label: 'active', tone: 'success' }),
    createElement(Button, { key: 'sv', onPress: () => success('Saved!'), children: 'Save' }),
  ]});
}

describe('library integration (web)', () => {
  it('composes components under SublimeProvider and fires a notification', () => {
    renderWeb(createElement(Panel));
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved!')).toBeTruthy();
  });
});
