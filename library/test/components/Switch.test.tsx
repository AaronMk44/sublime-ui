import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Switch } from '../../src/components/Switch/index.js';

describe('Switch (web)', () => {
  afterEach(cleanup);

  it('toggling calls onValueChange with the new value', () => {
    const onValueChange = vi.fn();
    renderWeb(
      createElement(Switch, { value: false, onValueChange, label: 'Wifi' }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wifi' }));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('marks the input disabled when disabled', () => {
    const onValueChange = vi.fn();
    renderWeb(
      createElement(Switch, {
        value: false,
        onValueChange,
        label: 'Nope',
        disabled: true,
      }),
    );
    expect(screen.getByRole('checkbox', { name: 'Nope' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
