/**
 * Preload bridge: exposes the typed native surface to the renderer.
 *
 * Runs in Electron's isolated preload context (the only place with access to
 * `contextBridge`). It exposes a single object, `window.sublimeNative`, whose
 * `invoke` forwards every call over the one generic `native:invoke` channel to
 * the main-process router (Task 6). Nothing else is exposed — keeping
 * `contextIsolation: true` / `nodeIntegration: false` meaningful — so the
 * renderer can only reach native functionality through the registry-validated
 * router. `useNative` (Task 8) reads this surface and revives error envelopes.
 */

/** Minimal `contextBridge` surface needed to expose the bridge. Injectable. */
export interface ContextBridgeLike {
  exposeInMainWorld(key: string, api: unknown): void;
}

/** Minimal `ipcRenderer` surface needed to forward invocations. Injectable. */
export interface IpcRendererLike {
  invoke(channel: string, ...args: any[]): Promise<unknown>;
}

/** Shape exposed at `window.sublimeNative`. */
export interface SublimeNativeBridge {
  invoke(mod: string, method: string, args: unknown[]): Promise<unknown>;
}

/**
 * Expose the `sublimeNative` bridge on the main world.
 *
 * @param contextBridge Electron's `contextBridge` (or a compatible fake).
 * @param ipcRenderer   Electron's `ipcRenderer` (or a compatible fake).
 */
export function exposeNativeBridge(
  contextBridge: ContextBridgeLike,
  ipcRenderer: IpcRendererLike,
): void {
  const bridge: SublimeNativeBridge = {
    invoke: (mod, method, args) =>
      ipcRenderer.invoke('native:invoke', mod, method, args),
  };
  contextBridge.exposeInMainWorld('sublimeNative', bridge);
}
