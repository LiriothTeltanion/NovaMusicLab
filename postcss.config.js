// Tailwind 4 moved its PostCSS plugin into a separate package. Using
// `tailwindcss` here directly fails with an error that points at an arbitrary
// CSS file and misleads: the problem is not that file, it is the plugin.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
