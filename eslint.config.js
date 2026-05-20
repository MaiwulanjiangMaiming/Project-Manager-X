const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const reactHooks = require('eslint-plugin-react-hooks');

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  __dirname: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
};

const browserGlobals = {
  document: 'readonly',
  window: 'readonly',
  HTMLElement: 'readonly',
  HTMLDivElement: 'readonly',
  KeyboardEvent: 'readonly',
  MouseEvent: 'readonly',
  MessageEvent: 'readonly',
  DragEvent: 'readonly',
  Node: 'readonly',
  navigator: 'readonly',
  acquireVsCodeApi: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...nodeGlobals,
        ...browserGlobals,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['src/extension/**/*.{ts,tsx}', 'src/core/**/*.ts', 'src/commands/**/*.ts'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    files: ['src/webview/**/*.{ts,tsx}'],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'out/', 'coverage/', '*.js'],
  },
];
