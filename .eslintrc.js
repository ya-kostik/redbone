module.exports = {
  parser: 'babel-eslint',
  plugins: ['security'],
  env: {
    es6: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:security/recommended'],
  rules: {
    'no-console': ['error', { 'allow': ['error', 'info'] }],
    'security/detect-object-injection': [0],
    'security/detect-non-literal-fs-filename': [0]
  },
  globals: {}
}
