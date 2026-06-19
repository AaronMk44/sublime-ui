import { describe, it, expect, beforeEach } from 'vitest';
import { installNativeRouter } from '../../src/bridge/main-router';
import { registerNative, clearRegistry } from '../../src/registry';
import { NativeError } from '../../src/errors';

type Handler = (e: unknown, ...args: any[]) => any;

function fakeIpcMain() {
  const handlers = new Map<string, Handler>();
  return {
    handle(channel: string, listener: Handler) {
      handlers.set(channel, listener);
    },
    invoke(channel: string, ...args: any[]) {
      const handler = handlers.get(channel);
      if (!handler) throw new Error('no handler for ' + channel);
      return handler({}, ...args);
    },
  };
}

beforeEach(() => clearRegistry());

describe('installNativeRouter', () => {
  it('registers the native:invoke channel', () => {
    const ipc = fakeIpcMain();
    installNativeRouter(ipc);
    expect(() => ipc.invoke('native:invoke', 'fs', 'noop', [])).not.toThrow();
  });

  it('resolves a registered call and returns its value', async () => {
    registerNative([
      { name: 'math', methods: { add: async (a: number, b: number) => a + b } },
    ]);
    const ipc = fakeIpcMain();
    installNativeRouter(ipc);
    await expect(ipc.invoke('native:invoke', 'math', 'add', [2, 3])).resolves.toBe(5);
  });

  it('returns a serialized NativeError envelope for an unregistered pair', async () => {
    const ipc = fakeIpcMain();
    installNativeRouter(ipc);
    const result = await ipc.invoke('native:invoke', 'fs', 'readFile', ['p']);
    expect(result).toEqual({
      __nativeError: { name: 'NativeError', message: 'Unknown native method fs:readFile' },
    });
  });

  it('returns the serialized error shape when an impl throws', async () => {
    registerNative([
      {
        name: 'fs',
        methods: {
          readFile: async () => {
            const err = new NativeError('boom', 'ENOENT');
            throw err;
          },
        },
      },
    ]);
    const ipc = fakeIpcMain();
    installNativeRouter(ipc);
    const result = await ipc.invoke('native:invoke', 'fs', 'readFile', ['p']);
    expect(result).toEqual({
      __nativeError: { name: 'NativeError', message: 'boom', code: 'ENOENT' },
    });
  });
});
