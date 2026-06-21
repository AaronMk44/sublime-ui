export const REQUIREMENTS = {
  node: { min: 18 },
  jdk: { major: 17 },
  ndk: '27.1.12297006',
  cmake: '3.22.1',
  buildTools: '35.0.0',
  platform: 'android-35',
} as const;

const TEMURIN_BASE =
  'https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11';

export const JDK_DOWNLOAD = {
  windowsX64: `${TEMURIN_BASE}/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.zip`,
  macX64: `${TEMURIN_BASE}/OpenJDK17U-jdk_x64_mac_hotspot_17.0.13_11.tar.gz`,
  macArm64: `${TEMURIN_BASE}/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.13_11.tar.gz`,
  linuxX64: `${TEMURIN_BASE}/OpenJDK17U-jdk_x64_linux_hotspot_17.0.13_11.tar.gz`,
  linuxArm64: `${TEMURIN_BASE}/OpenJDK17U-jdk_aarch64_linux_hotspot_17.0.13_11.tar.gz`,
} as const;

const CMDLINE_TOOLS_BASE = 'https://dl.google.com/android/repository';

export const CMDLINE_TOOLS_URL = {
  windows: `${CMDLINE_TOOLS_BASE}/commandlinetools-win-11076708_latest.zip`,
  mac: `${CMDLINE_TOOLS_BASE}/commandlinetools-mac-11076708_latest.zip`,
  linux: `${CMDLINE_TOOLS_BASE}/commandlinetools-linux-11076708_latest.zip`,
} as const;

/** Temurin 17 asset URL for the running OS/arch, or throws if unsupported. */
export function resolveJdkUrl(platform: NodeJS.Platform, arch: string): string {
  if (platform === 'win32' && arch === 'x64') return JDK_DOWNLOAD.windowsX64;
  if (platform === 'darwin' && arch === 'x64') return JDK_DOWNLOAD.macX64;
  if (platform === 'darwin' && arch === 'arm64') return JDK_DOWNLOAD.macArm64;
  if (platform === 'linux' && arch === 'x64') return JDK_DOWNLOAD.linuxX64;
  if (platform === 'linux' && arch === 'arm64') return JDK_DOWNLOAD.linuxArm64;
  throw new Error(
    `Unsupported platform/arch for the managed JDK: ${platform}/${arch}. ` +
      'Install a JDK 17 manually and set JAVA_HOME.',
  );
}

/** Google cmdline-tools zip URL for the running OS, or throws if unsupported. */
export function resolveCmdlineToolsUrl(platform: NodeJS.Platform): string {
  if (platform === 'win32') return CMDLINE_TOOLS_URL.windows;
  if (platform === 'darwin') return CMDLINE_TOOLS_URL.mac;
  if (platform === 'linux') return CMDLINE_TOOLS_URL.linux;
  throw new Error(
    `Unsupported platform for Android cmdline-tools: ${platform}. ` +
      'Install the Android SDK manually and set ANDROID_HOME.',
  );
}

/** Leading integer of a version string, or null if none. */
function leadingMajor(actual: string | null): number | null {
  if (actual === null) return null;
  const match = actual.match(/\d+/);
  if (match === null) return null;
  return Number.parseInt(match[0], 10);
}

export function satisfiesMajor(
  actual: string | null,
  requiredMajor: number,
): boolean {
  const major = leadingMajor(actual);
  return major !== null && major >= requiredMajor;
}

export function satisfiesExact(
  actual: string | null,
  required: string,
): boolean {
  return actual !== null && actual === required;
}
