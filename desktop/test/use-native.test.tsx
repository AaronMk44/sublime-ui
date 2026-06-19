import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNative } from '../src/use-native';
import { NativeError, serializeError } from '../src/errors';

type Fs = {
  readFile: (path: string) => Promise<string>;
};

afterEach(() => {
  delete (window as unknown as { sublimeNative?: unknown }).sublimeNative;
});

describe('useNative', () => {
  it('returns null on plain web (no window.sublimeNative)', () => {
    const { result } = renderHook(() => useNative<Fs>('fs'));
    expect(result.current).toBeNull();
  });

  it('forwards calls through the bridge invoke', async () => {
    const invoke = vi.fn().mockResolvedValue('contents');
    (window as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const { result } = renderHook(() => useNative<Fs>('fs'));
    expect(result.current).not.toBeNull();

    await expect(result.current!.readFile('/a.txt')).resolves.toBe('contents');
    expect(invoke).toHaveBeenCalledWith('fs', 'readFile', ['/a.txt']);
  });

  it('rethrows a {__nativeError} envelope as a NativeError', async () => {
    const envelope = {
      __nativeError: serializeError(
        Object.assign(new Error('boom'), { code: 'ENOENT' }),
      ),
    };
    const invoke = vi.fn().mockResolvedValue(envelope);
    (window as unknown as { sublimeNative: { invoke: typeof invoke } }).sublimeNative = {
      invoke,
    };

    const { result } = renderHook(() => useNative<Fs>('fs'));
    await expect(result.current!.readFile('/missing.txt')).rejects.toBeInstanceOf(
      NativeError,
    );
    await expect(result.current!.readFile('/missing.txt')).rejects.toMatchObject({
      message: 'boom',
      code: 'ENOENT',
    });
  });
});
