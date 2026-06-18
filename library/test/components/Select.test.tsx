import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Select } from '../../src/components/Select/index.js';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
];

describe('Select (web)', () => {
  afterEach(cleanup);

  it('renders the selected option label', () => {
    renderWeb(
      createElement(Select, { value: 'a', onChange: () => {}, options, label: 'Fruit' }),
    );
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    renderWeb(
      createElement(Select, { value: 'a', onChange, options, label: 'Fruit' }),
    );
    // Open the MUI select menu (the styled trigger is the first combobox).
    const trigger = screen.getAllByRole('combobox')[0]!;
    fireEvent.mouseDown(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
