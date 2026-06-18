import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { renderWeb } from '../../src/test-utils/renderWeb.js';
import { Text } from '../../src/components/Text/index.js';

describe('Text (web)', () => {
  it('renders its children', () => {
    renderWeb(createElement(Text, { children: 'Hello world' }));
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('uses muted color for the caption variant', () => {
    renderWeb(createElement(Text, { variant: 'caption', children: 'Muted caption' }));
    const node = screen.getByText('Muted caption');
    const muted = window.getComputedStyle(node).color;
    renderWeb(createElement(Text, { variant: 'body', children: 'Body text' }));
    const bodyNode = screen.getByText('Body text');
    const bodyColor = window.getComputedStyle(bodyNode).color;
    expect(muted).not.toBe('');
    expect(muted).not.toBe(bodyColor);
  });
});
