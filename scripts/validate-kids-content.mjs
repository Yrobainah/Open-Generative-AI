import fs from 'node:fs';
import { findJsonFiles, loadPolicy, validateEpisode } from '../lib/kids/safety/validate.mjs';

const policy = loadPolicy();
const files = findJsonFiles('content/season-01/episodes');
let failed = false;

for (const file of files) {
  const episode = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateEpisode(episode, policy);
  if (errors.length) {
    failed = true;
    console.error(`\n${file}`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`OK ${file}`);
  }
}

if (failed) process.exit(1);
console.log(`\n${files.length} manifiesto(s) validados.`);
