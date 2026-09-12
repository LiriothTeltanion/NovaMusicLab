#!/usr/bin/env node

import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  fetchLastfmHistory,
  parseUtcBoundary,
  writeLastfmCsvAtomically,
} from './lib/lastfmHistoryExport.mjs';

const HELP = `
Download a complete, frozen Last.fm listening-history snapshot for Nova Music Lab.

Usage:
  npm run lastfm:export -- --user YOUR_LASTFM_USERNAME

Options:
  --user <name>       Required Last.fm account name.
  --from <UTC>        Optional inclusive start (Unix seconds, ISO, or YYYY-MM-DD).
  --to <UTC>          Optional inclusive end (Unix seconds, ISO, or YYYY-MM-DD).
  --help              Show this help.

Security:
  The API key is read only from the LASTFM_API_KEY process environment variable.
  Never place it in this command or commit it to a file.
  The CSV is written outside the repository in your private local app-data folder.
`.trim();

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument === '--api-key' || argument.startsWith('--api-key=')) {
      throw new Error('Do not pass the API key on the command line. Use the secure PowerShell launcher.');
    }
    if (!['--user', '--from', '--to'].includes(argument)) {
      throw new Error(`Unknown option: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}.`);
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function exportFilename(now = new Date()) {
  const basename = `lastfm-history-${now.toISOString().replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')}`;
  return `${basename}.${'csv'}`;
}

function privateExportDirectory() {
  const localDataRoot = process.env.LOCALAPPDATA || join(homedir(), '.local', 'share');
  return join(localDataRoot, 'NovaMusicLab', 'private-exports', 'lastfm');
}

function formatUtc(unixTime) {
  return unixTime === undefined ? 'first available scrobble' : new Date(unixTime * 1_000).toISOString();
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }

  const apiKey = process.env.LASTFM_API_KEY;
  const lastfmUser = options.user;
  if (!lastfmUser) throw new Error('Missing --user. Run with --help for a safe example.');
  if (!apiKey) throw new Error('LASTFM_API_KEY is not available. Use scripts/export-lastfm-history.ps1.');

  const from = parseUtcBoundary(options.from, 'from');
  const to = parseUtcBoundary(options.to, 'to') ?? Math.floor(Date.now() / 1_000);
  if (from !== undefined && from > to) throw new Error('--from must not occur after --to.');

  const controller = new AbortController();
  const handleInterrupt = () => {
    process.stderr.write('\nCancelling safely...\n');
    controller.abort();
  };
  process.once('SIGINT', handleInterrupt);

  try {
    console.log('Nova Music Lab · private Last.fm history export');
    console.log(`Snapshot window: ${formatUtc(from)} -> ${formatUtc(to)}`);
    console.log('Downloading sequentially; the API key will not be printed or stored.');

    const result = await fetchLastfmHistory({
      apiKey,
      lastfmUser,
      from,
      to,
      signal: controller.signal,
      onProgress: ({ page, totalPages, downloaded, reportedTotal }) => {
        const pagesLabel = Math.max(1, totalPages);
        process.stdout.write(`\rPage ${page}/${pagesLabel} · ${downloaded}/${reportedTotal} dated scrobbles`);
      },
    });
    process.stdout.write('\n');

    const outputPath = join(privateExportDirectory(), exportFilename());
    const receipt = await writeLastfmCsvAtomically({
      rows: result.rows,
      outputPath,
      signal: controller.signal,
    });

    const oldest = result.rows[0]?.date ?? 'none';
    const newest = result.rows.at(-1)?.date ?? 'none';
    console.log('\nExport complete and validated.');
    console.log(`Scrobbles: ${result.reportedTotal}`);
    console.log(`Date range: ${oldest} -> ${newest}`);
    console.log(`Pages: ${result.pageCount}`);
    console.log(`Now-playing rows excluded: ${result.nowPlayingSkipped}`);
    console.log(`File: ${receipt.path}`);
    console.log(`Size: ${receipt.bytes} bytes`);
    console.log(`SHA-256: ${receipt.sha256}`);
    console.log('\nThis file is private and ignored by Git. Import it through Nova Upload when ready.');
  } finally {
    process.removeListener('SIGINT', handleInterrupt);
  }
}

main().catch(error => {
  const message = error?.name === 'AbortError'
    ? 'Export cancelled safely. No final file was written.'
    : error?.message || 'Unknown Last.fm export failure.';
  console.error(`\nERROR: ${message}`);
  process.exitCode = 1;
});
