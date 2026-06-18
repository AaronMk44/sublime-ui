import { ensurePortableJdk17 } from '../lib/jdk.js';
import { resolveAndroidHome } from '../lib/probe.js';
import { log } from '../util/log.js';

export async function setupCommand(): Promise<number> {
  if (process.platform !== 'win32') {
    log.info('Guided setup (macOS/Linux):');
    log.info('  1. Install Temurin JDK 17 and set JAVA_HOME.');
    log.info('  2. Install Android cmdline-tools; set ANDROID_HOME.');
    log.info('  3. sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"');
    log.info('  4. Re-run: sublime doctor');
    return 0;
  }
  log.step('Setting up Windows build environment…');
  const jdk = await ensurePortableJdk17();
  log.success(`Portable JDK 17 ready at ${jdk}`);
  if (resolveAndroidHome(process.env) === null) {
    log.warn('ANDROID_HOME is not set. Install Android SDK cmdline-tools and set ANDROID_HOME, then re-run: sublime doctor');
    return 1;
  }
  log.success('Setup complete. Run: sublime doctor');
  return 0;
}
