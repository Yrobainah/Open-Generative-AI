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

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

export function validateEpisode(episode, policy) {
  const errors = [];
  for (const field of policy.requiredEpisodeFields ?? []) {
    if (isMissing(episode[field])) errors.push(`Falta el campo obligatorio: ${field}`);
  }
  if (episode.code && !/^S\d{2}E\d{2}$/u.test(episode.code)) errors.push(`Código de episodio no válido: ${episode.code}`);
  if (episode.status && !(policy.allowedStatuses ?? []).includes(episode.status)) errors.push(`Estado no permitido: ${episode.status}`);
  if (episode.durationMinutes !== undefined) {
    const duration = Number(episode.durationMinutes);
    if (!Number.isFinite(duration) || duration < 3 || duration > 12) errors.push('durationMinutes debe estar entre 3 y 12 minutos.');
  }
  if (episode.launchPackage && !String(episode.launchPackage).endsWith('.json')) {
    errors.push('launchPackage debe señalar un manifiesto JSON.');
  }
  if (episode.publication && episode.publication.youtubeMadeForKids !== true) errors.push('publication.youtubeMadeForKids debe ser true.');
  for (const { location, value } of collectStrings(episode)) errors.push(...validateText(value, policy, location));
  if (episode.status === 'published' && policy.humanReviewRequired && episode.publication?.humanApproved !== true) {
    errors.push('No se puede publicar sin publication.humanApproved=true.');
  }
  return errors;
}

export function validateLaunchPackage(launchPackage, safetyPolicy) {
  const errors = [];
  const requiredFields = [
    'id',
    'episodeCode',
    'version',
    'status',
    'searchTitle',
    'openingHook',
    'thumbnailConcept',
    'song',
    'mainVideo',
    'shorts',
    'publicationVariants',
    'measurementGoals',
    'approval',
  ];

  for (const field of requiredFields) {
    if (isMissing(launchPackage[field])) errors.push(`Falta el campo obligatorio de paquete de lanzamiento: ${field}`);
  }

  if (!/^S\d{2}E\d{2}$/u.test(String(launchPackage.episodeCode ?? ''))) {
    errors.push(`episodeCode no válido: ${launchPackage.episodeCode}`);
  }

  if (!Number.isInteger(launchPackage.version) || launchPackage.version < 1) {
    errors.push('version debe ser un entero mayor o igual que 1.');
  }

  if (!['strategy', 'production', 'review', 'approved'].includes(launchPackage.status)) {
    errors.push(`Estado de paquete de lanzamiento no permitido: ${launchPackage.status}`);
  }

  const titleLength = String(launchPackage.searchTitle ?? '').length;
  if (titleLength < 20 || titleLength > 100) {
    errors.push('searchTitle debe tener entre 20 y 100 caracteres.');
  }

  const hookDuration = Number(launchPackage.openingHook?.durationSeconds);
  if (!Number.isFinite(hookDuration) || hookDuration < 3 || hookDuration > 15) {
    errors.push('openingHook.durationSeconds debe estar entre 3 y 15 segundos.');
  }

  const thumbnailWords = String(launchPackage.thumbnailConcept?.optionalText ?? '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
  const declaredMaximumWords = Number(launchPackage.thumbnailConcept?.maximumWords);
  if (!Number.isInteger(declaredMaximumWords) || declaredMaximumWords < 0 || declaredMaximumWords > 3) {
    errors.push('thumbnailConcept.maximumWords debe ser un entero entre 0 y 3.');
  }
  if (thumbnailWords > declaredMaximumWords) {
    errors.push('thumbnailConcept.optionalText supera el máximo de palabras declarado.');
  }

  const songDuration = Number(launchPackage.song?.durationSeconds);
  if (!Number.isFinite(songDuration) || songDuration < 45 || songDuration > 120) {
    errors.push('song.durationSeconds debe estar entre 45 y 120 segundos.');
  }
  if (!Array.isArray(launchPackage.song?.chorus) || launchPackage.song.chorus.length < 4) {
    errors.push('song.chorus debe contener al menos cuatro líneas.');
  }

  const mainDuration = Number(launchPackage.mainVideo?.targetDurationSeconds);
  if (!Number.isFinite(mainDuration) || mainDuration < 240 || mainDuration > 360) {
    errors.push('mainVideo.targetDurationSeconds debe estar entre 240 y 360 segundos.');
  }
  const segments = launchPackage.mainVideo?.segments;
  if (!Array.isArray(segments) || segments.length < 5) {
    errors.push('mainVideo.segments debe contener al menos cinco segmentos.');
  } else {
    if (Number(segments[0]?.startSecond) !== 0) errors.push('El primer segmento debe comenzar en el segundo 0.');
    let previousEnd = 0;
    segments.forEach((segment, index) => {
      const start = Number(segment.startSecond);
      const end = Number(segment.endSecond);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
        errors.push(`Segmento ${index + 1}: intervalo temporal no válido.`);
      }
      if (index > 0 && start !== previousEnd) {
        errors.push(`Segmento ${index + 1}: debe comenzar en ${previousEnd} para mantener continuidad.`);
      }
      previousEnd = end;
    });
    if (previousEnd !== mainDuration) {
      errors.push('El último segmento debe terminar en mainVideo.targetDurationSeconds.');
    }
  }

  const shorts = launchPackage.shorts;
  if (!Array.isArray(shorts) || shorts.length < 3) {
    errors.push('El paquete debe incluir al menos tres Shorts.');
  } else {
    const ids = new Set();
    shorts.forEach((short, index) => {
      const duration = Number(short.durationSeconds);
      if (isMissing(short.id) || ids.has(short.id)) errors.push(`Short ${index + 1}: id ausente o duplicado.`);
      ids.add(short.id);
      if (!Number.isFinite(duration) || duration < 15 || duration > 60) {
        errors.push(`Short ${index + 1}: durationSeconds debe estar entre 15 y 60.`);
      }
      if (short.format !== '9:16') errors.push(`Short ${index + 1}: format debe ser 9:16.`);
    });
  }

  for (const [variantName, variant] of Object.entries(launchPackage.publicationVariants ?? {})) {
    if (variant?.madeForKids !== true) errors.push(`publicationVariants.${variantName}.madeForKids debe ser true.`);
  }

  const retentionGoal = Number(launchPackage.measurementGoals?.retentionAt30SecondsPercent);
  const viewedGoal = Number(launchPackage.measurementGoals?.averageViewedPercent);
  if (!Number.isFinite(retentionGoal) || retentionGoal < 0 || retentionGoal > 100) {
    errors.push('measurementGoals.retentionAt30SecondsPercent debe estar entre 0 y 100.');
  }
  if (!Number.isFinite(viewedGoal) || viewedGoal < 0 || viewedGoal > 100) {
    errors.push('measurementGoals.averageViewedPercent debe estar entre 0 y 100.');
  }

  if (launchPackage.approval?.humanApproved === true && launchPackage.status !== 'approved') {
    errors.push('Un paquete aprobado por una persona debe usar status=approved.');
  }

  for (const { location, value } of collectStrings(launchPackage)) {
    errors.push(...validateText(value, safetyPolicy, location));
  }

  return errors;
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

export function validateModelSheet(modelSheet, safetyPolicy) {
  const errors = [];
  const requiredFields = ['id', 'characterId', 'version', 'status', 'asset', 'format', 'canvas', 'requiredViews', 'expressions', 'generation', 'approval'];
  for (const field of requiredFields) {
    if (isMissing(modelSheet[field])) errors.push(`Falta el campo obligatorio de hoja de modelo: ${field}`);
  }

  if (!['draft', 'reference', 'approved'].includes(modelSheet.status)) {
    errors.push(`Estado de hoja de modelo no permitido: ${modelSheet.status}`);
  }

  if (!Number.isInteger(modelSheet.version) || modelSheet.version < 1) {
    errors.push('version debe ser un entero mayor o igual que 1.');
  }

  const width = Number(modelSheet.canvas?.width);
  const height = Number(modelSheet.canvas?.height);
  if (!Number.isFinite(width) || width < 512 || !Number.isFinite(height) || height < 512) {
    errors.push('canvas debe declarar width y height de al menos 512 píxeles.');
  }

  const requiredViews = ['front', 'threeQuarter', 'side', 'back'];
  for (const view of requiredViews) {
    if (!modelSheet.requiredViews?.includes(view)) errors.push(`La hoja de modelo no incluye la vista obligatoria: ${view}`);
  }

  if (!Array.isArray(modelSheet.expressions) || modelSheet.expressions.length < 8) {
    errors.push('La hoja de modelo necesita al menos ocho expresiones.');
  }

  if (!String(modelSheet.asset ?? '').startsWith('/')) {
    errors.push('asset debe ser una ruta pública absoluta que comience por /.');
  } else {
    const assetPath = path.join('public', String(modelSheet.asset).replace(/^\/+/, ''));
    if (!fs.existsSync(assetPath)) errors.push(`No existe el activo de hoja de modelo: ${assetPath}`);
  }

  const strength = Number(modelSheet.generation?.referenceStrength);
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    errors.push('generation.referenceStrength debe estar entre 0 y 1.');
  }

  if (!/^\d{3,5}x\d{3,5}$/u.test(String(modelSheet.generation?.recommendedResolution ?? ''))) {
    errors.push('generation.recommendedResolution debe usar el formato ANCHOxALTO.');
  }

  if (isMissing(modelSheet.generation?.positivePrompt)) errors.push('Falta generation.positivePrompt.');
  if (isMissing(modelSheet.generation?.negativePrompt)) errors.push('Falta generation.negativePrompt.');

  if (modelSheet.approval?.humanApproved === true && modelSheet.status !== 'approved') {
    errors.push('Una hoja aprobada por una persona debe usar status=approved.');
  }

  for (const { location, value } of collectStrings(modelSheet)) {
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
