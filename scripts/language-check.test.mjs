// scripts/language-check.test.mjs
//
// Black-box tests for (1) the dwelling-type guard on "family"/"families" and (2) the
// population-characterization BLOCK rule. Runs the CLI and asserts the JSON.
//
//   node --test scripts/language-check.test.mjs
//
// Fixtures live in scripts/__fixtures__/ and are NOT in the screener's default
// scan globs, so they never affect a normal CI run.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(here, 'language-check.mjs');

// The screener resolves explicit file args against the repo root (parent of
// scripts/), independent of cwd — so pass repo-root-relative fixture paths.
function scan(fixture) {
  let out;
  try {
    out = execFileSync('node', [SCRIPT, '--json', `scripts/__fixtures__/${fixture}`], { encoding: 'utf8' });
  } catch (e) {
    out = e.stdout; // exit 1 on BLOCK findings; JSON is still written to stdout
  }
  return JSON.parse(out);
}

test('dwelling-type compounds do not flag "family"; bare "family" still warns', () => {
  const r = scan('family-types.mdx');
  const all = [...r.blocks, ...r.warns];
  assert.equal(
    all.filter((f) => f.line === 4 || f.line === 5).length, 0,
    'single-/multi-/two-/three-family lines (4,5) must produce no findings',
  );
  assert.ok(
    r.warns.some((f) => f.line === 6 && f.text.toLowerCase() === 'family'),
    'bare descriptive "family" (line 6) must still warn',
  );
  assert.ok(
    r.warns.some((f) => f.line === 7 && f.text.toLowerCase() === 'families'),
    'bare descriptive "families" (line 7) must warn',
  );
});

test('population characterization BLOCKs; named businesses/places do not', () => {
  const r = scan('population.mdx');
  const blocked = new Set(
    r.blocks.filter((b) => b.id === 'population-characterization').map((b) => b.line),
  );
  assert.ok(blocked.has(4), 'ethnicity + roots/communities must BLOCK (line 4)');
  assert.ok(blocked.has(5), 'religion + community/presence must BLOCK (line 5)');
  assert.ok(!blocked.has(6), 'Italian restaurant / Caribbean spots must NOT block (line 6)');
  assert.ok(!blocked.has(7), 'named market/bakeries must NOT block (line 7)');
});
