import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Lazy language/data chunks are intentionally exercised by the full
      // integration suite. Capping workers prevents CPU contention from
      // turning their normal async render into timing-only failures.
      maxWorkers: 4,
      environmentOptions: {
        jsdom: { url: 'http://localhost:3000/' },
      },
      globals: false,
      setupFiles: ['./src/test-setup.ts'],
    },
  })
)
