import { ensureManagedJdk17 } from '../lib/jdk.js';
import { ensureManagedSdk, managedSdkDir } from '../lib/android-sdk.js';
import { acceptLicenses as acceptLicensesDefault } from '../lib/sdkmanager.js';
import { ensureComponents } from '../lib/sdkmanager.js';
import { gatherProbes } from '../lib/probe.js';
import { buildDoctorReport, type DoctorReport } from '../lib/doctor-report.js';
import { REQUIREMENTS } from '../lib/requirements.js';
import { log } from '../util/log.js';

/** The full pinned toolchain `setup` installs in one shot. */
export const SETUP_COMPONENTS: string[] = [
  'platform-tools',
  `platforms;${REQUIREMENTS.platform}`,
  `build-tools;${REQUIREMENTS.buildTools}`,
  `ndk;${REQUIREMENTS.ndk}`,
  `cmake;${REQUIREMENTS.cmake}`,
];

export interface SetupDeps {
  ensureJdk: () => Promise<string>;
  ensureSdk: () => Promise<string>;
  acceptLicenses: (sdkRoot: string, jdkHome: string) => Promise<number>;
  installComponents: (sdkRoot: string, ids: string[], jdkHome: string) => Promise<void>;
  report: () => Promise<DoctorReport> | DoctorReport;
}

const defaultDeps: SetupDeps = {
  ensureJdk: () => ensureManagedJdk17(),
  ensureSdk: () => ensureManagedSdk(),
  acceptLicenses: acceptLicensesDefault,
  installComponents: ensureComponents,
  report: async () => buildDoctorReport(await gatherProbes()),
};

export async function setupCommand(deps: SetupDeps = defaultDeps): Promise<number> {
  log.banner('Sublime · Android build setup');
  const TOTAL = 5;

  log.phase(1, TOTAL, 'JDK 17 (Temurin)');
  const jdkHome = await deps.ensureJdk();

  log.phase(2, TOTAL, 'Android cmdline-tools');
  const sdkRoot = await deps.ensureSdk();

  log.phase(3, TOTAL, 'Accept SDK licenses');
  await deps.acceptLicenses(sdkRoot, jdkHome);

  log.phase(4, TOTAL, 'SDK packages');
  await deps.installComponents(sdkRoot, SETUP_COMPONENTS, jdkHome);

  log.phase(5, TOTAL, 'Verify');
  const report = await deps.report();
  log.table(report.rows);
  if (report.ok) {
    log.success(`Done — toolchain ready at ${managedSdkDir()}. Run: sublime build`);
    return 0;
  }
  log.warn('Setup finished but some checks did not pass — re-run: sublime setup');
  return 1;
}
