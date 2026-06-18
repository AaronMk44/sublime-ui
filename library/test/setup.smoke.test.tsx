import { describe, it, expect } from 'vitest';
import { createTheme } from '@mui/material';

describe('library test environment', () => {
  it('has jsdom', () => {
    expect(document.createElement('div').tagName).toBe('DIV');
  });
  it('can build an MUI theme', () => {
    const t = createTheme({ palette: { primary: { main: '#3b82f6' } } });
    expect(t.palette.primary.main).toBe('#3b82f6');
  });
});
