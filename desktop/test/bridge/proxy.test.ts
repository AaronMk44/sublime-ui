import { describe, it, expect, vi } from 'vitest';
import { createProxy } from '../../src/bridge/proxy';

describe('createProxy', () => {
  it('turns method access into invoke(mod, method, args)', async () => {
    const invoke = vi.fn().mockResolvedValue('ok');
    const p = createProxy<{ print: (r: number) => Promise<string> }>('printer', invoke);
    await expect(p.print(7)).resolves.toBe('ok');
    expect(invoke).toHaveBeenCalledWith('printer', 'print', [7]);
  });
});
