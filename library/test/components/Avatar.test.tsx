import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Avatar } from '../../src/components/Avatar/index.js';

describe('Avatar (web)', () => {
  it('renders initials when no source is provided', () => {
    renderWeb(createElement(Avatar, { label: 'Ada Lovelace' }));
    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('renders an image when a source is provided', () => {
    renderWeb(
      createElement(Avatar, { source: 'https://example.com/a.png', label: 'Ada' }),
    );
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/a.png');
  });
});
