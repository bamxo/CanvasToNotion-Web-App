import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/coverage',
      '**/node_modules',
      '.agents',
      'backend/_netlify-legacy',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: {
      'react-compiler': reactCompiler,
      'react-you-might-not-need-an-effect': reactYouMightNotNeedAnEffect,
    },
    rules: {
      'react-compiler/react-compiler': 'error',
      ...reactYouMightNotNeedAnEffect.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
