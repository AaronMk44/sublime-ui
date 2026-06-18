import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Fab } from '../../src/components/Fab/index.js';

describe('Fab (web)', () => {
  it('renders and fires onPress when clicked', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Fab, { icon: 'add', onPress, testID: 'fab' }));
    fireEvent.click(screen.getByTestId('fab'));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renders an extended label when provided', () => {
    renderWeb(createElement(Fab, { icon: 'add', label: 'Create' }));
    expect(screen.getByText('Create')).toBeTruthy();
  });
});
