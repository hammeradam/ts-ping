import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    markdown: false, // Disable markdown linting to avoid issues with code examples
  },
  {
    files: ['tsconfig.json'],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
  {
    files: ['src/example.ts'],
    rules: {
      // Allow console in example files
      'no-console': 'off',
    },
  },
)
