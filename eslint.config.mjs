import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Lint for the whole workspace. The boundary rules keep the dependency
// direction of docs/SYSTEM_ARCHITECTURE.md §5 enforced, not just documented.
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/lib/**',
      '**/node_modules/**',
      '**/dataconnect-generated/**',
      '**/.react-router/**',
      '**/.dataconnect/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/dataconnect-generated/**'], message: 'Import generated SDKs through @basis/shared/dataconnect/*.' },
          ],
        },
      ],
    },
  },
  {
    // The design system never touches data.
    files: ['packages/ui/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['firebase', 'firebase/*', '@basis/shared/dataconnect/*', '@tanstack/*'], message: 'UI components receive data as props.' }] },
      ],
    },
  },
  {
    // Domain code is pure.
    files: ['packages/shared/src/**/*.ts'],
    ignores: ['packages/shared/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['firebase', 'firebase/*', 'react', 'react/*'], message: 'Shared domain code has no I/O and no framework imports.' }] }],
    },
  },
  {
    // The public site never reaches the platform connector.
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@basis/shared/dataconnect/platform'], message: 'The website reads only the public connector.' }] }],
    },
  },
);
