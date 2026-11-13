import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const NO_DEFAULT_EXPORT = { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' };
const NO_BARREL = [
  {
    selector: 'ExportAllDeclaration',
    message: 'No barrel exports. Import directly from the source file.',
  },
  {
    selector: 'ExportNamedDeclaration[source]',
    message: 'No barrel exports. Import directly from the source file.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'dist/**',
      'dist-electron/**',
      'dist-test/**',
      'dist-test2/**',
      'release/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { jsxPragma: null },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/static-components': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-restricted-syntax': ['error', NO_DEFAULT_EXPORT, ...NO_BARREL],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      'no-var': 'error',
      'no-duplicate-imports': 'error',
      'max-lines': ['error', { max: 250 }],
    },
  },
  {
    files: ['src/pages/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_BARREL],
    },
  },
  {
    files: ['*.config.ts', 'src/types/*.d.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_BARREL],
    },
  },
  {
    files: ['src/utils/schemas.ts', 'src/types/index.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    files: ['src/database/sqlQuery.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  {
    files: ['src/main/logger.ts', 'src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/__tests__/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'max-lines': 'off',
    },
  }
);
