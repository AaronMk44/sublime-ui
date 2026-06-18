import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Checkbox } from '../../src/components/Checkbox/index.js';

describe('Checkbox (web)', () => {
  afterEach(cleanup);

  it('renders its label and toggles to true', () => {
    const onChange = vi.fn();
    renderWeb(
      createElement(Checkbox, { checked: false, onChange, label: 'Accept' }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles to false when already checked', () => {
    const onChange = vi.fn();
    renderWeb(createElement(Checkbox, { checked: true, onChange }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('marks the input disabled when disabled', () => {
    const onChange = vi.fn();
    renderWeb(
      createElement(Checkbox, { checked: false, onChange, disabled: true }),
    );
    expect(screen.getByRole('checkbox')).toHaveProperty('disabled', true);
  });
});
