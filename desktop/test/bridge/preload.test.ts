import { describe, it, expect } from 'vitest';
import { exposeNativeBridge } from '../../src/bridge/preload';

function fakeContextBridge() {
  const exposed = new Map<string, unknown>();
  return {
    exposeInMainWorld(key: string, api: unknown) {
      exposed.set(key, api);
    },
    exposed,
  };
}

function fakeIpcRenderer() {
  const calls: any[][] = [];
  return {
    invoke(...args: any[]) {
      calls.push(args);
      return Promise.resolve('ok');
    },
    calls,
  };
}

describe('exposeNativeBridge', () => {
  it('exposes the sublimeNative key in the main world', () => {
    const cb = fakeContextBridge();
    const ipc = fakeIpcRenderer();
    exposeNativeBridge(cb, ipc);
    expect(cb.exposed.has('sublimeNative')).toBe(true);
  });

  it('exposes an invoke that forwards to ipcRenderer.invoke on native:invoke', async () => {
    const cb = fakeContextBridge();
    const ipc = fakeIpcRenderer();
    exposeNativeBridge(cb, ipc);
    const api = cb.exposed.get('sublimeNative') as {
      invoke: (mod: string, method: string, args: unknown[]) => Promise<unknown>;
    };
    const result = await api.invoke('fs', 'readFile', ['p']);
    expect(result).toBe('ok');
    expect(ipc.calls).toEqual([['native:invoke', 'fs', 'readFile', ['p']]]);
  });
});
