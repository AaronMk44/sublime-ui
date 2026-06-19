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
    // The desktop native-bridge surface mandates `any` in a few interface
    // signatures (the spec fixes the IPC listener as `(e, ...a: any[]) => any`
    // and the registry/types entries as `(...a: any[]) => any`) so the generic
    // `native:invoke` channel can carry arbitrary, structured-clone-safe
    // payloads. Scope the relaxation to the desktop package only — the library
    // package keeps `no-explicit-any` enforced.
    files: ['desktop/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];
