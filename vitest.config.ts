import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: true,
    exclude: ['node_modules', 'dist', 'bin'],
    include: ['tests/**/*.test.ts']
  },
});
