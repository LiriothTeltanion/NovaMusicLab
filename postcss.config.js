// Tailwind 4 saco su complemento de PostCSS a un paquete aparte. Usar
// `tailwindcss` aqui directamente falla con un error que apunta a un fichero
// CSS cualquiera y despista: el problema no es ese fichero, es el complemento.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
