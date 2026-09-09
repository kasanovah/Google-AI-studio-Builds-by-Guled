import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public'] },

  // Frontend (browser, React)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // The plugin's own "recommended" bundle now also includes the newer
      // React Compiler-readiness rules (purity, immutability,
      // set-state-in-effect, static-components, …), which are more
      // opinionated and not what "hooks linting" means for an existing
      // codebase that wasn't written against them. Stick to the two
      // long-established rules that catch genuine hook-misuse bugs.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Matches this project's existing tsconfig (strict: false,
      // noUnusedLocals/noUnusedParameters: false) — flag unused vars/any as
      // warnings to catch going forward without forcing a repo-wide rewrite
      // of the existing loosely-typed code.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      // Empty catch blocks are a deliberate pattern in this codebase for
      // best-effort cleanup that shouldn't itself throw (e.g. deleting a
      // temp file). That's not a bug to flag.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Backend (Node)
  {
    files: ['server.ts', 'server/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  }
);
