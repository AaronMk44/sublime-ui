import { describe, it, expect } from 'vitest';
import { updateBarrel } from '../../src/lib/generators/barrel.js';

describe('updateBarrel', () => {
  it('appends a new line', () => {
    expect(updateBarrel("export * from './A.js';\n", "export * from './B.js';"))
      .toBe("export * from './A.js';\nexport * from './B.js';\n");
  });
  it('is idempotent — does not duplicate', () => {
    const start = "export * from './A.js';\n";
    expect(updateBarrel(start, "export * from './A.js';")).toBe(start);
  });
  it('handles empty existing content', () => {
    expect(updateBarrel('', "export * from './A.js';")).toBe("export * from './A.js';\n");
  });
});
