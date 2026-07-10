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

Por defecto, los archivos que importas se procesan localmente en el navegador y Nova Music Lab no envía tu historial a un servidor propio. El parser ignora campos sensibles del export de Spotify como `ip_addr`.

Lirioth funciona en modo sandbox local hasta que configuras voluntariamente tu propia API Key de Gemini. Al enviar un mensaje con esa opción activa, el navegador hace una solicitud directa a Google que incluye tu pregunta y un resumen agregado de escucha (métricas, artistas/canciones/géneros principales, países y eras); no incluye los archivos de exportación en bruto. La clave se guarda en el `localStorage` del navegador, así que úsala solo en un perfil o dispositivo de confianza. El uso de Gemini queda sujeto a las políticas de Google.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm run audit:data
npm run audit:data:strict
npm run compile:data -- --source-dir "C:\ruta\a\tus\exportaciones"
```

`compile:data` requiere una carpeta de exportaciones explícita para no leer archivos personales por accidente. Espera la estructura de exportación usada por el proyecto (`kevincusnir.csv`, `my_spotify_data/Spotify Extended Streaming History/` y/o `historial de videos/historial de reproducciones.html`) y actualiza `src/data/music_dna_compiled.json`. Puedes dirigir el resultado a otro archivo con `--output <ruta>` para revisarlo antes de reemplazar el dataset incluido.

## Estructura

- `src/utils/parser.ts`: importación y agregación de datos reales.
- `src/utils/analytics.ts`: cálculos compartidos para UI, récords, fuentes y normalización.
- `src/data/music_dna_compiled.json`: dataset incluido de Kevin / Lirioth.
- `src/components`: módulos visuales del museo musical.
- `src/context/AppContext.tsx`: idioma, tema y variables visuales.

## Notas de Calidad

El dataset incluido contiene una lectura ya curada. Cuando subes archivos nuevos, la app recalcula métricas desde cero. Si solo cargas Last.fm, no habrá skips/plataformas. Si solo cargas Spotify, no habrá scrobbles Last.fm. Si cargas ambos, el overlap se mide por artista + canción normalizados.
