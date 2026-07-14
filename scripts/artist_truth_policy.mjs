/**
 * Evidence-backed corrections for the bundled top-100 artist metadata.
 *
 * Country truth is derived dynamically from a single Wikidata country in the
 * audit. Genre truth is intentionally more conservative: every correction
 * below names the exact MusicBrainz tags that justify it. This avoids turning
 * noisy community tags (locations, events, jokes or mistaken homonyms) into
 * product-facing genres.
 */

export const GENERIC_GENRES = new Set(['alternative', 'unclassified']);
export const GENERIC_ARTIST_PERCENT_BUDGET = 15;
export const GENERIC_PLAY_PERCENT_BUDGET = 8;

export const HIGH_CONFIDENCE_GENRE_CORRECTIONS = [
  { artist: 'Myrath', genre: 'Progressive Metal / Oriental Metal', musicBrainzTags: ['progressive metal', 'oriental metal'] },
  { artist: 'Primal Fear', genre: 'Power Metal / Heavy Metal', musicBrainzTags: ['power metal', 'heavy metal'] },
  { artist: 'Type O Negative', genre: 'Gothic Metal / Doom Metal', musicBrainzTags: ['gothic metal', 'doom metal'] },
  { artist: 'Perturbator', genre: 'Synthwave / Darksynth', musicBrainzTags: ['synthwave', 'darksynth'] },
  { artist: 'Crazy Lixx', genre: 'Glam Metal / Hard Rock', musicBrainzTags: ['glam metal', 'hard rock'] },
  { artist: 'blessthefall', genre: 'Metalcore / Post-Hardcore', musicBrainzTags: ['metalcore', 'post-hardcore'] },
  { artist: 'Annihilator', genre: 'Thrash Metal / Heavy Metal', musicBrainzTags: ['thrash metal', 'heavy metal'] },
  { artist: 'Def Leppard', genre: 'Hard Rock / Glam Metal', musicBrainzTags: ['hard rock', 'glam metal'] },
  { artist: 'Thirty Seconds To Mars', genre: 'Alternative Rock / Progressive Rock', musicBrainzTags: ['alternative rock', 'progressive rock'] },
  { artist: 'Anathema', genre: 'Progressive Rock / Death-Doom Metal', musicBrainzTags: ['progressive rock', 'death-doom metal'] },
  { artist: 'Skid Row', genre: 'Glam Metal / Heavy Metal', musicBrainzTags: ['glam metal', 'heavy metal'] },
  { artist: 'Katatonia', genre: 'Doom Metal / Gothic Metal', musicBrainzTags: ['doom metal', 'gothic metal'] },
  { artist: 'Drake', genre: 'Hip-Hop / Contemporary R&B', musicBrainzTags: ['hip hop', 'contemporary r&b'] },
  { artist: 'Teenage Wrist', genre: 'Indie Rock / Alternative Rock', musicBrainzTags: ['indie rock', 'alternative rock'] },
  { artist: 'Silverstein', genre: 'Post-Hardcore / Emo', musicBrainzTags: ['post-hardcore', 'emo'] },
  { artist: 'The Killers', genre: 'Alternative Rock / Indie Rock', musicBrainzTags: ['alternative rock', 'indie rock'] },
  { artist: 'Crown The Empire', genre: 'Post-Hardcore / Metalcore', musicBrainzTags: ['post-hardcore', 'metalcore'] },
  { artist: 'Landon Tewers', genre: 'Post-Hardcore / Alternative Rock', musicBrainzTags: ['post-hardcore', 'alternative rock'] },
  { artist: 'Firehouse', genre: 'Glam Metal / Hard Rock', musicBrainzTags: ['glam metal', 'hard rock'] },
  { artist: 'Trevor Something', genre: 'Synthwave / Synth-Pop', musicBrainzTags: ['synthwave', 'synth-pop'] },
  { artist: 'The Kid LAROI', genre: 'Emo Rap / Pop Rap', musicBrainzTags: ['emo rap', 'pop rap'] },
  { artist: 'ERRA', genre: 'Progressive Metalcore / Djent', musicBrainzTags: ['progressive metalcore', 'djent'] },
  { artist: 'Entwine', genre: 'Gothic Metal', musicBrainzTags: ['gothic metal'] },
  { artist: 'Blackfield', genre: 'Progressive Rock / Art Rock', musicBrainzTags: ['progressive rock', 'art rock'] },
  { artist: 'FM-84', genre: 'Synthwave / Synth-Pop', musicBrainzTags: ['synthwave', 'synth-pop'] },
  { artist: 'Neck Deep', genre: 'Pop Punk / Punk Rock', musicBrainzTags: ['pop punk', 'punk rock'] },
  { artist: 'Lost Society', genre: 'Thrash Metal', musicBrainzTags: ['thrash metal'] },
  { artist: 'Polyphia', genre: 'Math Rock / Progressive Metal', musicBrainzTags: ['math rock', 'progressive metal'] },
  { artist: 'Sebastian Gampl', genre: 'Synthwave', musicBrainzTags: ['synthwave'] },
  { artist: 'Scar Symmetry', genre: 'Melodic Death Metal / Groove Metal', musicBrainzTags: ['melodic death metal', 'groove metal'] },
  { artist: 'Nine Inch Nails', genre: 'Industrial Rock / Industrial Metal', musicBrainzTags: ['industrial rock', 'industrial metal'] },
  { artist: 'Treat', genre: 'Hard Rock', musicBrainzTags: ['hard-rock'] },
  { artist: 'Issues', genre: 'Metalcore / Electronicore', musicBrainzTags: ['metalcore', 'electronicore'] },
  { artist: 'Asking Alexandria', genre: 'Metalcore / Post-Hardcore', musicBrainzTags: ['metalcore', 'post-hardcore'] },
  { artist: 'boy pablo', genre: 'Indie Pop / Indie Rock', musicBrainzTags: ['indie pop', 'indie rock'] },
  { artist: 'Being As An Ocean', genre: 'Post-Hardcore / Melodic Hardcore', musicBrainzTags: ['post-hardcore', 'melodic hardcore'] },
  { artist: 'The 1975', genre: 'Indie Pop / Indie Rock', musicBrainzTags: ['indie pop', 'indie rock'] },
  {
    artist: 'Rami Kleinstein',
    genre: 'Israeli Rock',
    musicBrainzTags: ['rock'],
    wikidataGenres: ['rock music'],
  },
  { artist: 'Skyharbor', genre: 'Progressive Metal / Djent', musicBrainzTags: ['progressive metal', 'djent'] },
  { artist: 'SOM', genre: 'Post-Metal / Shoegaze', musicBrainzTags: ['post-metal', 'shoegaze'] },
];

export const REJECTED_GENRE_EVIDENCE = [
  {
    artist: 'nightlife',
    tags: ['barbershop'],
    reason: 'The lone tag conflicts with the archive material and is likely a homonym match.',
  },
];
