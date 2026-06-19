import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { initApp, type Target } from '@sublime-ui/devkit';

const ALL: Target[] = ['web', 'mobile', 'desktop'];

export interface ParsedArgs {
  dir: string;
  name?: string;
  targets?: Target[];
  install: boolean;
  git: boolean;
  force: boolean;
  yes: boolean;
}

export function parseArgv(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  let targets: Target[] | undefined;
  let name: string | undefined;
  let install = true;
  let git = true;
  let force = false;
  let yes = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-install') install = false;
    else if (a === '--no-git') git = false;
    else if (a === '--force') force = true;
    else if (a === '--yes' || a === '-y') yes = true;
    else if (a === '--name') name = argv[++i];
    else if (a === '--targets') {
      targets = (argv[++i] ?? '')
        .split(',').map((s) => s.trim())
        .filter((s): s is Target => (ALL as string[]).includes(s));
    } else if (a && !a.startsWith('-')) positionals.push(a);
  }

  const first = positionals[0] ?? '.';
  return {
    dir: resolve(process.cwd(), first),
    ...(name !== undefined ? { name } : first !== '.' ? { name: first } : {}),
    ...(targets !== undefined ? { targets } : {}),
    install, git, force, yes,
  };
}

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2));
  const code = await initApp(args);
  process.exit(code);
}

// Run main() only when invoked directly as the bin, not when imported (tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
