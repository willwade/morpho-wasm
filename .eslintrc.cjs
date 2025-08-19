/* eslint-env node */
module.exports = {
  root: true,
  ignorePatterns: [
    '**/dist/**',
    '**/build/**',
    'packages/**/dist/**',
    'packages/**/build/**',
  ],
  overrides: [
    {
      files: ['packages/**/src/**/*.{ts,tsx,js}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: false
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
      }
    }
  ]
};

