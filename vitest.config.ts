import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Lazy language/data chunks are intentionally exercised by the full
      // integration suite. A single file at a time is slower but deterministic
      // on Windows/OneDrive and prevents timing-only failures under I/O load.
      maxWorkers: 1,
      fileParallelism: false,
      testTimeout: 45_000,
      hookTimeout: 45_000,
      environmentOptions: {
        jsdom: { url: 'http://localhost:3000/' },
      },
      globals: false,
      setupFiles: ['./src/test-setup.ts'],
    },
  })
)
