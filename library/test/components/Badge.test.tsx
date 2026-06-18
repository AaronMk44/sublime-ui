import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Badge } from '../../src/components/Badge/index.js';

const chipOf = (label: string): Element => {
  const chip = screen.getByText(label).closest('.MuiChip-root');
  if (chip === null) throw new Error('chip root not found');
  return chip;
};

describe('Badge (web)', () => {
  it('renders its label', () => {
    renderWeb(createElement(Badge, { label: 'New' }));
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('uses the soft bg token for the soft variant (distinct from solid)', () => {
    renderWeb(
      createElement('div', {}, [
        createElement(Badge, { key: 'a', label: 'Soft', tone: 'success', variant: 'soft' }),
        createElement(Badge, { key: 'b', label: 'Solid', tone: 'success', variant: 'solid' }),
      ]),
    );
    const softBg = getComputedStyle(chipOf('Soft')).backgroundColor;
    const solidBg = getComputedStyle(chipOf('Solid')).backgroundColor;
    expect(softBg).not.toBe('');
    expect(softBg).not.toBe(solidBg);
  });
});
