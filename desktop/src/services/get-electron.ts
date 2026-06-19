import type * as Electron from 'electron';

/**
 * Lazy, mockable accessor for the `electron` runtime module.
 *
 * The built-in native services run in the main process, where importing
 * `electron` is permitted. Going through this single indirection keeps the
 * import out of module-evaluation time (so the package can be loaded in
 * environments without Electron) and gives unit tests one seam to mock via
 * `vi.mock('electron', …)`.
 */
export async function getElectron(): Promise<typeof Electron> {
  return import('electron');
}
