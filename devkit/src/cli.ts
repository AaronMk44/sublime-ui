import { Command } from 'commander';
import { doctorCommand } from './commands/doctor.js';
import { setupCommand } from './commands/setup.js';
import { buildCommand } from './commands/build.js';
import { runCommand } from './commands/run.js';
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

program.parseAsync(process.argv).catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
