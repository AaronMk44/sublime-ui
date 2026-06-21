import { execa } from 'execa';

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  input?: string;
}

/** Runs a process, capturing output. Never throws on non-zero exit. */
export async function run(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<RunResult> {
  const result = await execa(file, args, {
    ...(opts.cwd === undefined ? {} : { cwd: opts.cwd }),
    env: { ...process.env, ...opts.env },
    ...(opts.input === undefined ? {} : { input: opts.input }),
    reject: false,
    all: false,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? 1,
  };
}

/** Runs a process with inherited stdio (live output). Returns exit code. */
export async function runInherit(
  file: string,
  args: string[],
  opts: RunOptions = {},
): Promise<number> {
  const result = await execa(file, args, {
    ...(opts.cwd === undefined ? {} : { cwd: opts.cwd }),
    env: { ...process.env, ...opts.env },
    stdio: 'inherit',
    reject: false,
  });
  return result.exitCode ?? 1;
}
