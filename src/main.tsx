import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { scheduleLocalDataBootstrap } from './bootstrapScheduler'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)

// Initialize the schema-v4 local database after load and idle time. The app
// product itself is v1.0; "v4" is strictly the IndexedDB schema version.
scheduleLocalDataBootstrap()

// Offline support is progressive enhancement: production only, never blocking.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('[Nova Music Lab] Offline service worker registration failed.', error)
    })
  })
}
