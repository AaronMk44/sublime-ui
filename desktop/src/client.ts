/**
 * Renderer-safe public API for `@sublime-ui/desktop` (`@sublime-ui/desktop/client`).
 *
 * This barrel re-exports ONLY the modules that are safe to pull into a web
 * renderer bundle: nothing here transitively imports `node:*` or `electron`.
 * An app's renderer can `import { useNative } from '@sublime-ui/desktop/client'`
 * and webpack will never see node/electron code, regardless of tree-shaking.
 *
 * The main barrel (`@sublime-ui/desktop`) additionally re-exports the
 * main-process shell + built-in services, which DO pull in node/electron; it is
 * marked side-effect-free so a `useNative`-only import can still be shaken, but
 * `./client` is the guaranteed-safe entry for renderer code.
 *
 * @remarks Author services in the main process from the main barrel (or its
 * `./services`), and `defineNative` is exported here too so renderer-shared
 * contract types stay reachable without crossing into node/electron.
 */

// Authoring + contract types (pure — no node/electron).
export { defineNative } from './define-native';
export type { NativeMethods, NativeService } from './types';

// Typed error transport (pure).
export {
  NativeError,
  serializeError,
  deserializeError,
  type SerializedError,
} from './errors';

// Renderer hook + proxy (pure — forward over the single IPC channel only).
export { useNative } from './use-native';
export { createProxy } from './bridge/proxy';
