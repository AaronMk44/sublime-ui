import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/dist/', '**/node_modules/', 'sandbox/', '**/*.cjs'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The desktop native-bridge *source* surface mandates `any` in a few
    // interface signatures (the spec fixes the IPC listener as
    // `(e, ...a: any[]) => any` and the registry/types entries as
    // `(...a: any[]) => any`) so the generic `native:invoke` channel can carry
    // arbitrary, structured-clone-safe payloads. Production code elsewhere
    // keeps `no-explicit-any` enforced.
    files: ['desktop/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Test sources across the monorepo build deliberately-malformed or fake
    // inputs to exercise validation and error paths — e.g. the navigation
    // tests cast intentionally-invalid node trees with `as any` to assert the
    // validator flags them, and the desktop tests mirror the spec-mandated IPC
    // signatures in their `ipcMain`/`ipcRenderer` fakes. Both legitimately need
    // `any`; relax the rule for test sources only (never production code).
    files: ['**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];
