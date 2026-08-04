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
import { validateOgaiProof } from '../lib/kids/safety/validate-proof.mjs';
import {
  validateCanonicalContinuityAsset,
  validateCanonicalVisualRegistry,
  validateContinuityManifest,
  validateSectionContract,
} from '../lib/kids/safety/validate-continuity.mjs';
import { validateLumoProduction } from '../lib/kids/safety/validate-production.mjs';

const safetyPolicy = loadPolicy();
const characterPolicy = loadCharacterPolicy();
const episodeFiles = findJsonFiles('content/season-01/episodes');
const launchPackageFiles = findJsonFiles('content/season-01/packages');
const storyboardFiles = findJsonFiles('content/season-01/storyboards');
const keyframeFiles = findJsonFiles('content/season-01/keyframes');
const proofFiles = findJsonFiles('content/season-01/proofs');
const characterFiles = findJsonFiles('content/characters/profiles');
const modelSheetFiles = findJsonFiles('content/characters/model-sheets');
const continuityEnvironmentFiles = findJsonFiles('content/continuity/environments');
const continuityPropFiles = findJsonFiles('content/continuity/props');
const continuityVoiceFiles = findJsonFiles('content/continuity/voices');
const continuityCastFiles = findJsonFiles('content/continuity/cast');
const continuitySectionFiles = findJsonFiles('content/continuity/sections');
const continuityManifestFile = 'content/continuity/continuity-manifest.json';
const continuityVisualRegistryFile = 'content/continuity/visual-assets-v1.json';
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

for (const file of proofFiles) {
  const proof = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateOgaiProof(proof, safetyPolicy));
}

const characters = characterFiles.map((file) => ({
  file,
  value: JSON.parse(fs.readFileSync(file, 'utf8')),
}));

for (const { file, value } of characters) {
  report(file, validateCharacter(value, safetyPolicy, characterPolicy));
}

for (const file of modelSheetFiles) {
  const modelSheet = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateModelSheet(modelSheet, safetyPolicy));
}

if (!fs.existsSync(continuityManifestFile)) {
  report(continuityManifestFile, ['Falta el manifiesto de continuidad.']);
} else {
  const continuityManifest = JSON.parse(fs.readFileSync(continuityManifestFile, 'utf8'));
  report(continuityManifestFile, validateContinuityManifest(continuityManifest));
}

if (!fs.existsSync(continuityVisualRegistryFile)) {
  report(continuityVisualRegistryFile, ['Falta el registro visual canónico.']);
} else {
  const visualRegistry = JSON.parse(fs.readFileSync(continuityVisualRegistryFile, 'utf8'));
  report(continuityVisualRegistryFile, validateCanonicalVisualRegistry(visualRegistry));
}

const continuityAssetFiles = [
  ...continuityEnvironmentFiles,
  ...continuityPropFiles,
  ...continuityVoiceFiles,
  ...continuityCastFiles,
];
const continuityAssets = continuityAssetFiles.map((file) => ({
  file,
  value: JSON.parse(fs.readFileSync(file, 'utf8')),
}));

for (const { file, value } of continuityAssets) {
  report(file, validateCanonicalContinuityAsset(value, file));
}

const knownCharacters = new Set(characters.map(({ value }) => value.id));
const canonicalIds = new Set();
for (const { value } of continuityAssets) {
  if (value.id) canonicalIds.add(value.id);
  for (const component of value.components || []) if (component.id) canonicalIds.add(component.id);
  for (const voice of value.voices || []) if (voice.id) canonicalIds.add(voice.id);
  for (const citizen of value.citizens || []) if (citizen.id) canonicalIds.add(citizen.id);
}

for (const file of continuitySectionFiles) {
  const section = JSON.parse(fs.readFileSync(file, 'utf8'));
  report(file, validateSectionContract(section, knownCharacters, canonicalIds));
}

report('Lumo production operating system', validateLumoProduction());

if (failed) process.exit(1);
console.log(
  `\n${episodeFiles.length} episodio(s), ${launchPackageFiles.length} paquete(s), ${storyboardFiles.length} storyboard(s), ${keyframeFiles.length} conjunto(s) de keyframes, ${proofFiles.length} prueba(s) OGAI, ${characterFiles.length} personaje(s), ${modelSheetFiles.length} hoja(s) de modelo, ${continuityAssetFiles.length} recurso(s) canónico(s) y ${continuitySectionFiles.length} contrato(s) de sección validados.`,
);
