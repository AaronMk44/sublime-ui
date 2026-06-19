export type Target = 'web' | 'mobile' | 'desktop';

export interface ScaffoldFile {
  /** Path relative to the app root, POSIX-style. */
  path: string;
  contents: string;
}

export interface ScaffoldOptions {
  dir: string;
  name?: string;
  targets?: Target[];
  force?: boolean;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
}
