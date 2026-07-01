# Nova Music Lab 🎧

Dashboard personal de análisis musical para explorar historial de Last.fm y Spotify como estadísticas, eras, mapas emocionales, récords, logros e informe narrativo.

## Qué Puede Analizar

- Last.fm CSV con artista, álbum, canción y fecha.
- Spotify Extended Streaming History JSON.
- Carga mixta Last.fm + Spotify para comparar fuentes.
- Top artistas, canciones, álbumes y géneros inferidos.
- Heatmap por hora y día.
- Actividad mensual real cuando la fuente la permite.
- Sesiones, rachas, máximos diarios y obsesiones por canción.
- Países de conexión, plataformas, skips y plays cortos de Spotify.

## Privacidad 🔒

Los archivos se leen localmente en el navegador. El parser ignora campos sensibles del export de Spotify como `ip_addr`. La app no sube datos a ningún servidor.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

## Estructura

- `src/utils/parser.ts`: importación y agregación de datos reales.
- `src/utils/analytics.ts`: cálculos compartidos para UI, récords, fuentes y normalización.
- `src/data/music_dna_compiled.json`: dataset incluido de Kevin / Lirioth.
- `src/components`: módulos visuales del museo musical.
- `src/context/AppContext.tsx`: idioma, tema y variables visuales.

## Notas de Calidad

El dataset incluido contiene una lectura ya curada. Cuando subes archivos nuevos, la app recalcula métricas desde cero. Si solo cargas Last.fm, no habrá skips/plataformas. Si solo cargas Spotify, no habrá scrobbles Last.fm. Si cargas ambos, el overlap se mide por artista + canción normalizados.

