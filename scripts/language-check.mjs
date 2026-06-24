#!/usr/bin/env node
// scripts/language-check.mjs
//
// Thin CLI for the language checker. The screening logic lives in ./lang/engine.mjs
// (universal) and the vocabulary lives in ./lang/packs/* (per-domain). This file
// just parses flags, picks a pack, and hands off.
//
//   node scripts/language-check.mjs                       # scan default globs (fair-housing)
//   node scripts/language-check.mjs --strict              # caution-tier also fails the build
//   node scripts/language-check.mjs --all                 # widen scan to .astro/.tsx/.html/.json
//   node scripts/language-check.mjs --json                # machine-readable findings on stdout
//   node scripts/language-check.mjs --pack=fair-housing   # choose a pack (default: fair-housing)
//   node scripts/language-check.mjs path/a.mdx ...        # scan explicit files instead of globs
//
// Exit codes:  0 = clean (no BLOCK; no WARN under --strict)    1 = disqualifying finding
//
// To screen for a different "chosen language", add a pack under ./lang/packs/
// and register it in PACKS below — the engine, suppression, allow-list, and CI
// semantics are identical across packs.

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { run } from './lang/engine.mjs';
import * as scanConfig from './lang/scan-config.mjs';
import fairHousing from './lang/packs/fair-housing.mjs';

const PACKS = {
  'fair-housing': fairHousing,
  // 'inclusive-language': inclusiveLanguage,
  // 'brand-voice': brandVoice,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const packId = (argv.find((a) => a.startsWith('--pack=')) || '--pack=fair-housing').split('=')[1];

const pack = PACKS[packId];
if (!pack) {
  console.error(`[language] unknown pack "${packId}". available: ${Object.keys(PACKS).join(', ')}`);
  process.exit(1);
}

run({
  pack,
  scanConfig,
  root: ROOT,
  strict: flag('--strict'),
  scanAll: flag('--all'),
  asJson: flag('--json'),
  explicitFiles: argv.filter((a) => !a.startsWith('--')),
});
