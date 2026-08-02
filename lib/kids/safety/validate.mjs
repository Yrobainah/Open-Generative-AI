import fs from 'node:fs';
import path from 'node:path';

export function loadPolicy(policyPath = 'config/kids-safety.json') {
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

export function loadCharacterPolicy(policyPath = 'config/character-consistency.json') {
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

export function validateText(text, policy, location = 'contenido') {
  const errors = [];
  const value = String(text ?? '');
  for (const pattern of policy.blockedPatterns ?? []) {
    const regex = new RegExp(pattern, 'iu');
    if (regex.test(value)) errors.push(`${location}: contenido bloqueado por la regla ${pattern}`);
  }
  return errors;
}

function collectStrings(value, location = '$', output = []) {
  if (typeof value === 'string') output.push({ location, value });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${location}[${index}]`, output));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectStrings(item, `${location}.${key}`, output);
  }
  return output;
}

export function validateEpisode(episode, policy) {
  const errors = [];
  for (const field of policy.requiredEpisodeFields ?? []) {
    if (episode[field] === undefined || episode[field] === null || episode[field] === '') errors.push(`Falta el campo obligatorio: ${field}`);
  }
  if (episode.code && !/^S\d{2}E\d{2}$/u.test(episode.code)) errors.push(`Código de episodio no válido: ${episode.code}`);
  if (episode.status && !(policy.allowedStatuses ?? []).includes(episode.status)) errors.push(`Estado no permitido: ${episode.status}`);
  if (episode.durationMinutes !== undefined) {
    const duration = Number(episode.durationMinutes);
    if (!Number.isFinite(duration) || duration < 3 || duration > 12) errors.push('durationMinutes debe estar entre 3 y 12 minutos.');
  }
  if (episode.publication && episode.publication.youtubeMadeForKids !== true) errors.push('publication.youtubeMadeForKids debe ser true.');
  for (const { location, value } of collectStrings(episode)) errors.push(...validateText(value, policy, location));
  if (episode.status === 'published' && policy.humanReviewRequired && episode.publication?.humanApproved !== true) {
    errors.push('No se puede publicar sin publication.humanApproved=true.');
  }
  return errors;
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

export function validateCharacter(character, safetyPolicy, characterPolicy) {
  const errors = [];

  for (const field of characterPolicy.requiredFields ?? []) {
    if (isMissing(character[field])) errors.push(`Falta el campo obligatorio de personaje: ${field}`);
  }

  for (const field of characterPolicy.requiredVisualFields ?? []) {
    if (isMissing(character.visual?.[field])) errors.push(`Falta visual.${field}`);
  }

  for (const key of characterPolicy.requiredPaletteKeys ?? []) {
    const color = character.visual?.palette?.[key];
    if (isMissing(color)) errors.push(`Falta visual.palette.${key}`);
    else if (!/^#[0-9A-F]{6}$/iu.test(color)) errors.push(`Color hexadecimal no válido en visual.palette.${key}: ${color}`);
  }

  const scale = Number(character.visual?.scaleRelativeToLumo);
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 1.5) {
    errors.push('visual.scaleRelativeToLumo debe estar entre 0.5 y 1.5.');
  }

  if (!Array.isArray(character.expressions) || character.expressions.length < (characterPolicy.minimumExpressions ?? 6)) {
    errors.push(`El personaje necesita al menos ${characterPolicy.minimumExpressions ?? 6} expresiones.`);
  }

  if (!Array.isArray(character.negativePrompt) || character.negativePrompt.length < (characterPolicy.minimumNegativePromptItems ?? 6)) {
    errors.push(`negativePrompt necesita al menos ${characterPolicy.minimumNegativePromptItems ?? 6} restricciones.`);
  }

  const views = character.designSheet?.requiredViews ?? [];
  for (const view of characterPolicy.requiredViews ?? []) {
    if (!views.includes(view)) errors.push(`Falta la vista obligatoria: ${view}`);
  }

  const promptText = String(character.promptTemplate ?? '').toLocaleLowerCase('es');
  for (const term of characterPolicy.forbiddenReferenceTerms ?? []) {
    if (promptText.includes(String(term).toLocaleLowerCase('es'))) {
      errors.push(`promptTemplate contiene una referencia visual prohibida: ${term}`);
    }
  }

  for (const { location, value } of collectStrings(character)) {
    errors.push(...validateText(value, safetyPolicy, location));
  }

  return errors;
}

export function findJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...findJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.json')) output.push(fullPath);
  }
  return output.sort();
}
