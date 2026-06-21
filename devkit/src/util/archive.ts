import { mkdirSync } from 'node:fs';
import AdmZip from 'adm-zip';
import { extract as tarExtract } from 'tar';

/** Extracts a .tar.gz/.tgz into `dest` (created if absent). */
export async function extractTarGz(archive: string, dest: string): Promise<void> {
  mkdirSync(dest, { recursive: true });
  await tarExtract({ file: archive, cwd: dest });
}

/** Extracts a .zip into `dest` (created if absent). */
export async function extractZip(archive: string, dest: string): Promise<void> {
  mkdirSync(dest, { recursive: true });
  // adm-zip is synchronous and resolves reliably across Node versions (the
  // previous extract-zip returned a promise that never settled on Node 24).
  new AdmZip(archive).extractAllTo(dest, true);
}

/** Extracts by extension: .zip → zip, .tar.gz/.tgz → tar. */
export async function extractArchive(archive: string, dest: string): Promise<void> {
  if (archive.endsWith('.zip')) return extractZip(archive, dest);
  if (archive.endsWith('.tar.gz') || archive.endsWith('.tgz')) {
    return extractTarGz(archive, dest);
  }
  throw new Error(`Unsupported archive type: ${archive}`);
}
