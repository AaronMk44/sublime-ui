import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadFile } from '../src/util/download.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'dl-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

/** Minimal fake fetch returning a streamed body with a content-length. */
function fakeFetch(body: string, ok = true, status = 200): typeof fetch {
  const bytes = new TextEncoder().encode(body);
  return (async () => ({
    ok,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-length' ? String(bytes.length) : null) },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, Math.ceil(bytes.length / 2)));
        controller.enqueue(bytes.slice(Math.ceil(bytes.length / 2)));
        controller.close();
      },
    }),
  })) as unknown as typeof fetch;
}

describe('downloadFile', () => {
  it('writes the streamed body to disk and reports progress to completion', async () => {
    const dest = join(dir, 'out.bin');
    const seen: Array<[number, number]> = [];
    await downloadFile('http://x/file', dest, (r, t) => seen.push([r, t]), fakeFetch('hello world'));
    expect(readFileSync(dest, 'utf8')).toBe('hello world');
    const last = seen.at(-1)!;
    expect(last[0]).toBe(last[1]); // received reached total
    expect(last[1]).toBe(11);
  });

  it('throws on a non-OK status', async () => {
    const dest = join(dir, 'out.bin');
    await expect(
      downloadFile('http://x/missing', dest, undefined, fakeFetch('nope', false, 404)),
    ).rejects.toThrow(/404/);
  });
});
