import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('Invalid JPEG signature');
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }

  throw new Error('JPEG dimensions were not found');
}

function webpDimensions(buffer) {
  if (
    buffer.length < 30
    || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('Invalid WebP signature');
  }

  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: readUint24LE(buffer, 24) + 1,
      height: readUint24LE(buffer, 27) + 1,
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

export function assertSafeRepositoryPath(relativePath) {
  if (
    typeof relativePath !== 'string'
    || relativePath.length === 0
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
    || relativePath.split('/').includes('..')
  ) {
    throw new Error(`Unsafe repository path: ${String(relativePath)}`);
  }
}

export function imageDimensions(buffer, filePath = '') {
  const extension = path.extname(filePath).toLowerCase();
  if (
    extension === '.png'
    && buffer.length >= 24
    && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a'
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  if (
    extension === '.gif'
    && buffer.length >= 10
    && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
  ) {
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    return jpegDimensions(buffer);
  }
  if (extension === '.webp') {
    return webpDimensions(buffer);
  }
  if (extension === '.svg') {
    const source = buffer.toString('utf8', 0, Math.min(buffer.length, 8_192));
    const svgTag = source.match(/<svg\b[^>]*>/i)?.[0] ?? '';
    const width = Number.parseFloat(svgTag.match(/\bwidth=["']([\d.]+)/i)?.[1] ?? '');
    const height = Number.parseFloat(svgTag.match(/\bheight=["']([\d.]+)/i)?.[1] ?? '');
    if (Number.isFinite(width) && Number.isFinite(height)) return { width, height };

    const viewBox = svgTag.match(/\bviewBox=["'][\d.\s-]+["']/i)?.[0]
      .match(/["']([\d.\s-]+)["']/)?.[1]
      .trim()
      .split(/\s+/)
      .map(Number);
    if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
      return { width: viewBox[2], height: viewBox[3] };
    }
  }

  throw new Error(`Unsupported or invalid image format: ${filePath}`);
}

export function countGifFrames(buffer) {
  if (
    buffer.length < 10
    || !['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
  ) return 0;

  const packedFields = buffer[10];
  const globalColorTableSize = (packedFields & 0x80)
    ? 3 * (2 ** ((packedFields & 0x07) + 1))
    : 0;
  let offset = 13 + globalColorTableSize;
  let frames = 0;

  const skipSubBlocks = () => {
    while (offset < buffer.length) {
      const size = buffer[offset];
      offset += 1;
      if (size === 0) return true;
      offset += size;
    }
    return false;
  };

  while (offset < buffer.length) {
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0x3b) return frames;
    if (marker === 0x21) {
      offset += 1;
      if (!skipSubBlocks()) return 0;
      continue;
    }
    if (marker === 0x2c) {
      if (offset + 9 > buffer.length) return 0;
      const imagePackedFields = buffer[offset + 8];
      offset += 9;
      if (imagePackedFields & 0x80) {
        offset += 3 * (2 ** ((imagePackedFields & 0x07) + 1));
      }
      offset += 1;
      if (!skipSubBlocks()) return 0;
      frames += 1;
      continue;
    }
    return 0;
  }

  return frames;
}

export async function buildMediaRecord(projectRoot, definition) {
  assertSafeRepositoryPath(definition.path);
  const absolutePath = path.join(projectRoot, ...definition.path.split('/'));
  const bytes = await readFile(absolutePath);
  const dimensions = imageDimensions(bytes, definition.path);

  return {
    id: definition.id,
    path: definition.path,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.length,
    lang: definition.lang,
    theme: definition.theme,
    viewport: definition.viewport,
  };
}
