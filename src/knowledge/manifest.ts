import manifestJson from '../data/artist_knowledge_manifest.json';
import { validateArtistKnowledgeManifest } from '../db/validation';
import type { ArtistKnowledgeManifest } from './types';

const validationErrors = validateArtistKnowledgeManifest(manifestJson);
if (validationErrors.length) {
  throw new Error(`Invalid bundled artist knowledge manifest: ${validationErrors.slice(0, 5).join(' ')}`);
}

export const artistKnowledgeManifest = manifestJson as ArtistKnowledgeManifest;
