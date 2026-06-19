import { describe, it, expect } from 'vitest';
import { defineNative } from '../src/define-native';

describe('defineNative', () => {
  it('returns a { name, methods } service whose methods are callable', async () => {
    const service = defineNative('printer', { print: async () => {} });
    expect(service.name).toBe('printer');
    expect(typeof service.methods.print).toBe('function');
    await expect(service.methods.print()).resolves.toBeUndefined();
  });

  it('carries the method signatures on the returned type', async () => {
    const service = defineNative('printer', {
      print: async (copies: number): Promise<string> => `printed ${copies}`,
    });
    await expect(service.methods.print(3)).resolves.toBe('printed 3');
  });
});
