import { Command } from 'commander';
import { doctorCommand } from './commands/doctor.js';
import { setupCommand } from './commands/setup.js';
import { buildCommand } from './commands/build.js';
import { runCommand } from './commands/run.js';
import { input } from '@inquirer/prompts';
import { makeModel } from './commands/make-model.js';
import { makeComponent } from './commands/make-component.js';
import { themeInit } from './commands/theme-init.js';
import { buildNav } from './commands/build-nav.js';
import { log } from './util/log.js';

const program = new Command();

program
  .name('sublime')
  .description('Sublime UI devkit — offline Android builds and tooling')
  .version('0.0.0');

program
  .command('doctor')
  .description('Check the environment for offline Android builds')
  .action(async () => {
    process.exit(await doctorCommand());
  });

program
  .command('setup')
  .description('Install/repair the build environment')
  .action(async () => {
    process.exit(await setupCommand());
  });

program
  .command('build')
  .description('Build a standalone Android APK/AAB offline')
  .option('--release', 'release APK (default)', true)
  .option('--debug', 'debug APK (requires Metro)')
  .option('--aab', 'Android App Bundle (bundleRelease)')
  .option('--project <path>', 'project directory', process.cwd())
  .action(async (opts: { release: boolean; debug?: boolean; aab?: boolean; project: string }) => {
    const code = await buildCommand({
      project: opts.project,
      release: opts.debug ? false : true,
      aab: opts.aab ?? false,
    });
    process.exit(code);
  });

program
  .command('run')
  .description('Install and launch the built APK on a device')
  .option('--device <id>', 'adb device serial')
  .option('--project <path>', 'project directory', process.cwd())
  .action(async (opts: { device?: string; project: string }) => {
    process.exit(
      await runCommand(
        opts.device === undefined
          ? { project: opts.project }
          : { project: opts.project, device: opts.device },
      ),
    );
  });

program
  .command('make:model <name>')
  .description('Scaffold a Model (+ registerModel) for the framework')
  .option('--fields <spec>', 'fields, e.g. "name:string, tags:Tag[]"')
  .option('--resource <path>', 'override the REST resource path')
  .option('--force', 'overwrite existing files')
  .action(async (name: string, opts: { fields?: string; resource?: string; force?: boolean }) => {
    const code = await makeModel({
      name,
      cwd: process.cwd(),
      force: opts.force ?? false,
      ...(opts.fields ? { fields: opts.fields } : {}),
      ...(opts.resource ? { resource: opts.resource } : {}),
      promptFields: () =>
        input({ message: 'Fields (name:type, comma-separated; blank for id-only):', default: '' }),
    });
    process.exit(code);
  });

program
  .command('make:component <name>')
  .description('Scaffold a cross-platform component (types + web + native + index)')
  .option('--mobile-only', 'mobile-only component (web renders a null stub)')
  .option('--force', 'overwrite existing files')
  .action(async (name: string, opts: { mobileOnly?: boolean; force?: boolean }) => {
    process.exit(await makeComponent({
      name, cwd: process.cwd(), mobileOnly: opts.mobileOnly ?? false, force: opts.force ?? false,
    }));
  });

program
  .command('theme:init')
  .description('Scaffold the app design tokens (tokens.json + typed wrapper)')
  .option('--force', 'overwrite existing files')
  .action(async (opts: { force?: boolean }) => {
    process.exit(await themeInit({ cwd: process.cwd(), force: opts.force ?? false }));
  });

program
  .command('build:nav')
  .description('Compile per-platform storybooks into navigation artifacts')
  .option('--watch', 'rebuild on storybook changes')
  .option('--force', 'overwrite generated files')
  .option('--project <path>', 'project directory', process.cwd())
  .action(async (opts: { watch?: boolean; force?: boolean; project: string }) => {
    const code = await buildNav({
      cwd: opts.project,
      watch: opts.watch ?? false,
      force: opts.force ?? false,
    });
    // In watch mode, leave the process running so the fs.watch handlers stay
    // alive; exiting here would tear them down before the first rebuild fires.
    if (!opts.watch) process.exit(code);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
