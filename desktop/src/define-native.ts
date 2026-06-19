import type { NativeMethods, NativeService } from './types';

/**
 * Author a native service from the main process.
 *
 * A thin, fully-typed wrapper: it pairs a service `name` with its async
 * `methods` so that `typeof service` preserves each method's signature.
 * That preserved type is what the renderer contract is derived from, giving
 * end-to-end type safety across the `native:invoke` IPC boundary.
 *
 * @example
 * const printer = defineNative('printer', {
 *   print: async (copies: number): Promise<string> => `printed ${copies}`,
 * });
 */
export function defineNative<M extends NativeMethods>(
  name: string,
  methods: M,
): NativeService<M> {
  return { name, methods };
}
