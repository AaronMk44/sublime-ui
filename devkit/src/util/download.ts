import { createWriteStream } from 'node:fs';
import { Writable } from 'node:stream';

export type ProgressFn = (received: number, total: number) => void;

/**
 * Streams `url` to `dest`, invoking `onProgress(received, total)` as chunks
 * arrive (total is 0 when the server omits Content-Length). Uses the global
 * `fetch` (Node >=18); `fetchImpl` is injectable for tests. Throws on a
 * non-OK HTTP status or a missing body.
 */
export async function downloadFile(
  url: string,
  dest: string,
  onProgress?: ProgressFn,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  if (res.body === null) {
    throw new Error(`Download returned an empty body for ${url}`);
  }
  const total = Number(res.headers.get('content-length') ?? '0');
  let received = 0;

  const file = createWriteStream(dest);
  const sink = new Writable({
    write(chunk: Buffer, _enc, cb): void {
      received += chunk.length;
      onProgress?.(received, total);
      file.write(chunk, () => cb());
    },
  });

  await new Promise<void>((resolve, reject) => {
    sink.on('error', reject);
    file.on('error', reject);
    void (async () => {
      try {
        const reader = res.body!.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          await new Promise<void>((res2, rej2) =>
            sink.write(Buffer.from(value), (e) => (e ? rej2(e) : res2())),
          );
        }
        sink.end(() => file.end(() => resolve()));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}
