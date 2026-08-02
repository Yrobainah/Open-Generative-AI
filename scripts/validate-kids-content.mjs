import fs from 'node:fs';
import {
  findJsonFiles,
  loadCharacterPolicy,
  loadPolicy,
  validateCharacter,
  validateEpisode,
  validateLaunchPackage,
  validateModelSheet,
} from '../lib/kids/safety/validate.mjs';
import { validateStoryboard } from '../lib/kids/safety/validate-storyboard.mjs';

const safetyPolicy = loadPolicy();
const characterPolicy = loadCharacterPolicy();
const episodeFiles = findJsonFiles('content/season-01/episodes');
const launchPackageFiles = findJsonFiles('content/season-01/packages');
const storyboardFiles = findJsonFiles('content/season-01/storyboards');
const characterFiles = findJsonFiles('content/characters/profiles');
const modelSheetFiles = findJsonFiles('content/characters/model-sheets');
let failed = false;

function report(file, errors) {
  if (errors.length) {
    failed = true;
    console.error(`\n${file}`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`OK ${file}`);
  }
}

for (const file of episodeFiles) {
  const episode = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateEpisode(episode, safetyPolicy));
}

for (const file of launchPackageFiles) {
  const launchPackage = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateLaunchPackage(launchPackage, safetyPolicy));
}

for (const file of storyboardFiles) {
  const storyboard = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateStoryboard(storyboard, safetyPolicy));
}

for (const file of characterFiles) {
  const character = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateCharacter(character, safetyPolicy, characterPolicy));
}

for (const file of modelSheetFiles) {
  const modelSheet = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateModelSheet(modelSheet, safetyPolicy));
}

if (failed) process.exit(1);
console.log(
  `\n${episodeFiles.length} episodio(s), ${launchPackageFiles.length} paquete(s), ${storyboardFiles.length} storyboard(s), ${characterFiles.length} personaje(s) y ${modelSheetFiles.length} hoja(s) de modelo validados.`,
);
