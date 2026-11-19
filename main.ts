// Leonida Ledger — the hand-in program for gta6-trophy-guide-01.
//
// It copies this repository's app/ (the offline guide and tracker) and
// screenshots/ into the output directory and writes /output/dossier.json with
// buildDossier from the kit's vendored library (vendor/makefun-frontend.ts,
// unchanged). Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: the same repository always writes the same
// bytes, so the grader's two runs match byte for byte.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// Clear any previous run's output first, so a re-run never leaves stale files
// behind and the two grader runs write identical bytes.
for (const sub of ['app', 'screenshots']) {
  const dir = join(out, sub);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Self-check: the dossier must exist and be non-empty, and a second build from
// the same output must be byte-identical (buildDossier is deterministic, so a
// mismatch would mean the output directory changed under us).
const first = readFileSync(join(out, 'dossier.json'));
if (first.length === 0) throw new Error('dossier.json is empty');
const second = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
if (!first.equals(Buffer.from(second))) throw new Error('dossier.json is not reproducible');
console.log(`Leonida Ledger handed in: dossier.json is ${first.length} bytes, reproducible.`);
