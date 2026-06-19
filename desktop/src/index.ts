/**
 * Public API for `@sublime-ui/desktop`.
 *
 * A typed native bridge over one secure generic IPC channel (`native:invoke`):
 * author services in the main process with {@link defineNative}, register them
 * with {@link registerNative}, dispatch them through {@link installNativeRouter}
 * / {@link exposeNativeBridge}, and consume them in the renderer with
 * {@link useNative}. {@link startDesktop} / {@link createWindow} provide the
 * hardened Electron shell, and the built-in services (`fs`, `dialog`, `shell`,
 * `clipboard`, `notifications`) cover the common cases out of the box.
 *
 * @remarks
 * The renderer must import native modules type-only; the only runtime crossing
 * is the single `native:invoke` channel.
 */

// Core authoring + contract types.
export { defineNative } from './define-native';
export { registerNative } from './registry';
export type { NativeMethods, NativeService } from './types';

// Typed error transport.
export {
  NativeError,
  serializeError,
  deserializeError,
  type SerializedError,
} from './errors';

// Renderer hook + proxy.
export { useNative } from './use-native';
export { createProxy } from './bridge/proxy';

// Main-process router + preload bridge.
export {
  installNativeRouter,
  type IpcMainLike,
  type NativeErrorEnvelope,
} from './bridge/main-router';
export {
  exposeNativeBridge,
  type ContextBridgeLike,
  type IpcRendererLike,
  type SublimeNativeBridge,
} from './bridge/preload';

// Hardened Electron shell.
export {
  createWindow,
  type BrowserWindowLike,
  type BrowserWindowCtor,
  type CreateWindowOptions,
} from './shell/create-window';
export {
  startDesktop,
  type AppLike,
  type StartDesktopOptions,
} from './shell/main';

// Built-in services.
export {
  fs,
  dialog,
  shell,
  clipboard,
  notifications,
  type NotifyOptions,
} from './services/index';
