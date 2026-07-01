/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgBase: '#050b14',
        bgPanel: 'rgba(10, 25, 47, 0.7)',
        bgPanelLight: 'rgba(17, 34, 64, 0.8)',
        cyberCyan: '#00f2fe',
        cyberPink: '#f72585',
        cyberPurple: '#7209b7',
        cyberBlue: '#4cc9f0',
        neonGlow: '0 0 20px rgba(0, 242, 254, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        cyber: '0 0 15px rgba(0, 242, 254, 0.3), 0 0 30px rgba(114, 9, 183, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
