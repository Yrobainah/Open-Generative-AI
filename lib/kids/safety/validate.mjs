import fs from 'node:fs';
import path from 'node:path';

export function loadPolicy(policyPath = 'config/kids-safety.json') {
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
