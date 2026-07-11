import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the static build works at any mount path
  // (GitHub Pages project sites live under /<repo>/).
  base: './',
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  build: {
    rolldownOptions: {
      output: {
        // Stable vendor chunks: framework code changes far less often than app
        // code, so splitting it keeps returning visitors' caches warm across
        // app-only deploys - and keeps the app's own entry chunk small enough
        // that a data/library regression is visible at a glance in the build
        // output (guarded by scripts/check_bundle_budget.mjs).
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'vendor-motion', test: /node_modules[\\/]framer-motion[\\/]/ },
            { name: 'vendor-charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
            { name: 'vendor-icons', test: /node_modules[\\/]lucide-react[\\/]/ },
          ],
        },
      },
    },
  },
})
