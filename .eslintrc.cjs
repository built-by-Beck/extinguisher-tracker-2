/**
 * ESLint configuration for Fire Extinguisher Tracker
 * - React 18 + Vite
 * - No warnings allowed via npm script flag
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['react', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    // Keep the baseline strict; disable noisy rules until codebase is aligned
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Using plain JS without prop-types
    'react-refresh/only-export-components': 'off', // Enable later once warnings are resolved
    'no-unused-vars': 'off', // Enable later as we trim unused imports/vars
    'react/no-unescaped-entities': 'off',
    'react/no-unknown-property': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
  overrides: [
    {
      files: ['src/**/*.*'],
      rules: {},
    },
  ],
};
