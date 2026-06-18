import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Button } from '../../src/components/Button/index.js';

describe('Button (web)', () => {
  it('renders its label and fires onPress', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Button, { onPress, children: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledOnce();
  });
  it('disables interaction when disabled', () => {
    const onPress = vi.fn();
    renderWeb(createElement(Button, { onPress, disabled: true, children: 'Nope' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
