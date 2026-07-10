import fs from 'fs';
import path from 'path';

const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

async function main() {
  console.log('Downloading low-res world countries GeoJSON...');
  try {
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.statusText}`);
    }
    const geojson = await res.json();
    console.log(`Successfully downloaded GeoJSON. Features count: ${geojson.features.length}`);

    const countries = [];

    for (const feature of geojson.features) {
      const name = feature.properties.name;
      const id = feature.id;
      const type = feature.geometry.type;
      const coordinates = feature.geometry.coordinates;

      // Extract and simplify polygons
      const countryPolygons = [];

      const simplifyPolygon = (coords) => {
        // Keep every 2nd or 3rd coordinate to keep the globe highly performant at 60fps
        const result = [];
        const skip = coords.length > 50 ? 3 : coords.length > 20 ? 2 : 1;
        for (let i = 0; i < coords.length; i += skip) {
          result.push({
            lon: parseFloat(coords[i][0].toFixed(2)),
            lat: parseFloat(coords[i][1].toFixed(2)),
          });
        }
        // Ensure closed loop
        if (result.length > 0 && (result[0].lat !== result[result.length - 1].lat || result[0].lon !== result[result.length - 1].lon)) {
          result.push({ ...result[0] });
        }
        return result;
      };

      if (type === 'Polygon') {
        const poly = simplifyPolygon(coordinates[0]);
        if (poly.length > 3) {
          countryPolygons.push(poly);
        }
      } else if (type === 'MultiPolygon') {
        for (const polyCoords of coordinates) {
          const poly = simplifyPolygon(polyCoords[0]);
          if (poly.length > 3) {
            countryPolygons.push(poly);
          }
        }
      }

      let latSum = 0, lonSum = 0, ptCount = 0;
      if (countryPolygons.length > 0) {
        for (const poly of countryPolygons) {
          for (const pt of poly) {
            latSum += pt.lat;
            lonSum += pt.lon;
            ptCount++;
          }
        }
      }
      const center = ptCount > 0 
        ? { lat: parseFloat((latSum / ptCount).toFixed(2)), lon: parseFloat((lonSum / ptCount).toFixed(2)) }
        : { lat: 0, lon: 0 };

      if (countryPolygons.length > 0) {
        countries.push({
          id,
          name,
          center,
          polygons: countryPolygons,
        });
      }
    }

    console.log(`Processed ${countries.length} countries.`);
    
    // Write as TS file
    const outputPath = path.resolve('src/data/worldMapData.ts');
    const content = `// Auto-generated world map simplified country borders
export interface WorldCountryBorder {
  id: string;
  name: string;
  center: { lat: number; lon: number };
  polygons: { lat: number; lon: number }[][];
}

export const WORLD_MAP_DATA: WorldCountryBorder[] = ${JSON.stringify(countries, null, 2)};
`;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`Successfully wrote ${countries.length} countries to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching world map:', error);
    process.exit(1);
  }
}

main();
