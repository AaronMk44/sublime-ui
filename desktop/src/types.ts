/**
 * Core contract types for native services.
 *
 * A native service is a named bag of async methods authored in the main
 * process. Methods are always async because every call crosses the
 * `native:invoke` IPC boundary.
 */

/** A map of async native methods keyed by method name. */
export type NativeMethods = Record<string, (...args: any[]) => Promise<any>>;

/** A named native service: its `name` plus its async `methods`. */
export interface NativeService<M extends NativeMethods = NativeMethods> {
  name: string;
  methods: M;
}
