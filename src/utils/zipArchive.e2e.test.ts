import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { expandZipArchives } from './zipArchive';
import { parseMusicSources } from './parser';

/**
 * End-to-end check against a ZIP produced by Windows' own compressor rather than
 * by fflate, so the extractor is proven against an archive it did not create.
 * Skipped when the fixture is absent - it is generated outside the repository so
 * no listening data is ever committed.
 */
const FIXTURE = process.env.NOVA_SPOTIFY_ZIP_FIXTURE ?? '';
const available = FIXTURE.length > 0 && fs.existsSync(FIXTURE);

describe.skipIf(!available)('Spotify ZIP end to end', () => {
  it('turns a real Spotify archive into a parsed museum', async () => {
    const bytes = fs.readFileSync(path.resolve(FIXTURE));
    const archive = new File([bytes as unknown as BlobPart], 'my_spotify_data.zip');

    const expansion = await expandZipArchives([archive]);
    expect(expansion.unreadableArchives).toEqual([]);
    expect(expansion.emptyArchives).toEqual([]);
    expect(expansion.files.length).toBeGreaterThan(0);
    // Identity and payment files must never survive extraction.
    expect(expansion.files.some(file => /identity|payments/i.test(file.name))).toBe(false);

    const spotifyJsonTexts = await Promise.all(expansion.files.map(file => file.text()));
    const parsed = parseMusicSources({ csvTexts: [], spotifyJsonTexts, youtubeHtmlTexts: [] });

    expect(parsed.core_metrics.total_plays).toBeGreaterThan(0);
    expect(parsed.core_metrics.unique_artists).toBeGreaterThan(0);
    expect(parsed.top_artists.length).toBeGreaterThan(0);
  });
});
