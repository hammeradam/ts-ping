import antfu from '@antfu/eslint-config'

export default antfu({
  files: ['eslint.config.js'],
  rules: {
    'jsonc/sort-keys': 'off',
  },
})
