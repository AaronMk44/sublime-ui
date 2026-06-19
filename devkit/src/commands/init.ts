import { input, checkbox } from '@inquirer/prompts';
import { basename } from 'node:path';
import { initApp, type Prompt, type PostRunner } from '../lib/scaffold/init.js';
import type { Target } from '../lib/scaffold/types.js';

const ALL: Target[] = ['web', 'mobile', 'desktop'];

function parseTargets(spec: string | undefined): Target[] | undefined {
  if (!spec) return undefined;
  const parts = spec.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.filter((p): p is Target => (ALL as string[]).includes(p));
}

const inquirerPrompt: Prompt = async ({ dir }) => {
  const name = await input({ message: 'App name:', default: basename(dir) });
  const targets = (await checkbox({
    message: 'Targets:',
    choices: [
      { name: 'web (Vite + MUI)', value: 'web', checked: true },
      { name: 'mobile (React Native + Paper)', value: 'mobile', checked: true },
      { name: 'desktop (Electron, wraps web)', value: 'desktop', checked: true },
    ],
  })) as Target[];
  return { name, targets };
};

export async function runInit(opts: {
  dir: string;
  name?: string;
  targets?: string;
  install: boolean;
  git: boolean;
  force: boolean;
  yes: boolean;
  prompt?: Prompt;
  runner?: PostRunner;
}): Promise<number> {
  const targets = parseTargets(opts.targets);
  return initApp({
    dir: opts.dir,
    ...(opts.name !== undefined ? { name: opts.name } : {}),
    ...(targets !== undefined ? { targets } : {}),
    install: opts.install,
    git: opts.git,
    force: opts.force,
    yes: opts.yes,
    prompt: opts.prompt ?? inquirerPrompt,
    ...(opts.runner !== undefined ? { runner: opts.runner } : {}),
  });
}
