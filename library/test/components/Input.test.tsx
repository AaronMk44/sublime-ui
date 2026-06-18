import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Input } from '../../src/components/Input/index.js';

describe('Input (web)', () => {
  it('calls onChangeText when the user types', () => {
    const onChangeText = vi.fn();
    renderWeb(
      createElement(Input, { value: '', onChangeText, label: 'Name', placeholder: 'Enter name' }),
    );
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'Ada' } });
    expect(onChangeText).toHaveBeenCalledWith('Ada');
  });

  it('shows the error helper text when error is set', () => {
    renderWeb(
      createElement(Input, { value: 'x', onChangeText: () => {}, error: 'Required field' }),
    );
    expect(screen.getByText('Required field')).toBeTruthy();
  });
});
