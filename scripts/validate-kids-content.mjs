import fs from 'node:fs';
import {
  findJsonFiles,
  loadCharacterPolicy,
  loadPolicy,
  validateCharacter,
  validateEpisode,
  validateLaunchPackage,
  validateModelSheet,
  validateText,
} from '../lib/kids/safety/validate.mjs';
import { validateStoryboard } from '../lib/kids/safety/validate-storyboard.mjs';
import { validateKeyframeSet } from '../lib/kids/safety/validate-keyframes.mjs';

const safetyPolicy = loadPolicy();
const characterPolicy = loadCharacterPolicy();
const episodeFiles = findJsonFiles('content/season-01/episodes');
const launchPackageFiles = findJsonFiles('content/season-01/packages');
const storyboardFiles = findJsonFiles('content/season-01/storyboards');
const keyframeFiles = findJsonFiles('content/season-01/keyframes');
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

const storyboards = storyboardFiles.map((file) => ({
  file,
  value: JSON.parse(fs.readFileSync(file, 'utf8')),
}));

for (const { file, value } of storyboards) {
  report(file, validateStoryboard(value, safetyPolicy));
}

for (const file of keyframeFiles) {
  const keyframeSet = JSON.parse(fs.readFileSync(file, 'utf8'));
  const storyboard = storyboards.find(({ value }) => value.id === keyframeSet.storyboardId)?.value;
  report(file, validateKeyframeSet(keyframeSet, storyboard, safetyPolicy, validateText));
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
  `\n${episodeFiles.length} episodio(s), ${launchPackageFiles.length} paquete(s), ${storyboardFiles.length} storyboard(s), ${keyframeFiles.length} conjunto(s) de keyframes, ${characterFiles.length} personaje(s) y ${modelSheetFiles.length} hoja(s) de modelo validados.`,
);
