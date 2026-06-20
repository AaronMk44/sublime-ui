/** Published @sublime-ui ranges the generated app depends on. Bump here on release. */
export const SUBLIME_VERSIONS = {
  framework: '^1.0.0',
  library: '^1.0.0',
  ui: '^1.0.0',
  desktop: '^1.0.0',
} as const;

/** Peer runtimes the generated app installs, by target. */
export const PEER_VERSIONS: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'react-redux': '^9.1.2',
  '@mui/material': '^6.1.6',
  '@emotion/react': '^11.13.3',
  '@emotion/styled': '^11.13.0',
  'react-router-dom': '^6.27.0',
  'react-native': '^0.76.1',
  'react-native-paper': '^5.12.5',
  'react-native-safe-area-context': '^4.14.0',
  '@react-navigation/native': '^6.1.18',
  '@react-navigation/native-stack': '^6.11.0',
  '@react-navigation/bottom-tabs': '^6.6.1',
  electron: '^33.0.0',
  vite: '^5.4.0',
  '@vitejs/plugin-react': '^4.3.0',
  typescript: '^5.6.0',
};
