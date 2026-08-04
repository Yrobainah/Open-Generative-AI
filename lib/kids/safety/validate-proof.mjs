import { validateText } from './validate.mjs';

const ALLOWED_CHARACTERS = new Set(['Lumo', 'Nara', 'Tuno', 'Biri', 'Pompón', 'Nublo']);
const ALLOWED_DURATIONS = new Set([5, 10, 15]);
const REQUIRED_STUDIOS = ['image', 'video', 'audio', 'lipSync'];

function missing(value) {
  return value === undefined || value === null || value === '';
}

function collectStrings(value, location = '$', output = []) {
  if (typeof value === 'string') output.push({ location, value });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${location}[${index}]`, output));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => collectStrings(item, `${location}.${key}`, output));
  return output;
}

export function validateOgaiProof(proof, safetyPolicy) {
  const errors = [];
  const required = [
    'id',
    'episodeCode',
    'version',
    'status',
    'title',
    'targetDurationSeconds',
    'aspectRatio',
    'resolution',
    'productionPlatform',
    'externalRenderingAllowed',
    'humanReviewRequired',
    'studios',
    'globalVisualPrompt',
    'globalNegativePrompt',
    'referenceRequirements',
    'shots',
    'completionRules',
    'results',
    'approval',
  ];

  for (const field of required) if (missing(proof[field])) errors.push(`Falta el campo obligatorio de prueba OGAI: ${field}`);

  if (!/^S\d{2}E\d{2}$/u.test(String(proof.episodeCode ?? ''))) errors.push(`episodeCode no válido: ${proof.episodeCode}`);
  if (!Number.isInteger(proof.version) || proof.version < 1) errors.push('version debe ser un entero mayor o igual que 1.');
  if (!['draft', 'ready-for-generation', 'review', 'approved'].includes(proof.status)) errors.push(`Estado de prueba no permitido: ${proof.status}`);
  if (proof.productionPlatform !== 'Open-Generative-AI') errors.push('productionPlatform debe ser Open-Generative-AI.');
  if (proof.externalRenderingAllowed !== false) errors.push('externalRenderingAllowed debe ser false.');
  if (proof.humanReviewRequired !== true) errors.push('humanReviewRequired debe ser true.');
  if (proof.aspectRatio !== '16:9') errors.push('La prueba debe usar aspectRatio=16:9.');
  if (proof.resolution !== '1920x1080') errors.push('La prueba debe usar resolution=1920x1080.');
  if (Number(proof.targetDurationSeconds) !== 25) errors.push('targetDurationSeconds debe ser exactamente 25.');

  for (const studioName of REQUIRED_STUDIOS) {
    const studio = proof.studios?.[studioName];
    if (!studio?.route || !studio?.recommendedModelId || !studio?.recommendedModelName || !studio?.purpose) {
      errors.push(`Falta la configuración completa del estudio ${studioName}.`);
    }
  }

  if (proof.studios?.image?.recommendedModelId !== 'nano-banana-2-edit') errors.push('Image Studio debe recomendar nano-banana-2-edit.');
  if (proof.studios?.video?.recommendedModelId !== 'seedance-v2.0-i2v') errors.push('Video Studio debe recomendar seedance-v2.0-i2v.');
  if (proof.studios?.audio?.recommendedModelId !== 'elevenlabs-text-to-dialogue-v3') errors.push('Audio Studio debe recomendar elevenlabs-text-to-dialogue-v3.');
  if (proof.studios?.lipSync?.recommendedModelId !== 'infinitetalk-video-to-video') errors.push('Lip Sync debe recomendar infinitetalk-video-to-video.');

  if (!Array.isArray(proof.globalNegativePrompt) || proof.globalNegativePrompt.length < 8) errors.push('globalNegativePrompt necesita al menos ocho restricciones.');
  if (!Array.isArray(proof.referenceRequirements) || proof.referenceRequirements.length < 4) errors.push('referenceRequirements necesita al menos cuatro referencias.');

  const shots = proof.shots;
  if (!Array.isArray(shots) || shots.length !== 3) {
    errors.push('La prueba debe contener exactamente tres planos.');
  } else {
    let total = 0;
    const ids = new Set();
    shots.forEach((shot, index) => {
      const label = `Plano ${index + 1}`;
      const expectedId = `PT${String(index + 1).padStart(2, '0')}`;
      if (shot.id !== expectedId) errors.push(`${label}: se esperaba ${expectedId}.`);
      if (ids.has(shot.id)) errors.push(`${label}: id duplicado ${shot.id}.`);
      ids.add(shot.id);

      const duration = Number(shot.durationSeconds);
      if (!ALLOWED_DURATIONS.has(duration)) errors.push(`${label}: durationSeconds debe ser 5, 10 o 15.`);
      total += duration;

      if (!shot.title || !Array.isArray(shot.characters) || shot.characters.length === 0) errors.push(`${label}: faltan título o personajes.`);
      for (const character of shot.characters ?? []) if (!ALLOWED_CHARACTERS.has(character)) errors.push(`${label}: personaje no reconocido ${character}.`);
      if (String(shot.imagePrompt ?? '').length < 180) errors.push(`${label}: imagePrompt debe tener al menos 180 caracteres.`);
      if (String(shot.videoPrompt ?? '').length < 180) errors.push(`${label}: videoPrompt debe tener al menos 180 caracteres.`);
      if (!shot.audioPlan?.music || !shot.audioPlan?.ambience || !Array.isArray(shot.audioPlan?.sfx)) errors.push(`${label}: audioPlan debe declarar music, ambience y sfx.`);
      if (!Array.isArray(shot.approvalCriteria) || shot.approvalCriteria.length < 4) errors.push(`${label}: approvalCriteria necesita al menos cuatro criterios.`);

      if (!Array.isArray(shot.dialogue)) errors.push(`${label}: dialogue debe ser un array.`);
      for (const [lineIndex, line] of (shot.dialogue ?? []).entries()) {
        if (!line?.speaker || !line?.text || !line?.direction) errors.push(`${label}, diálogo ${lineIndex + 1}: faltan speaker, text o direction.`);
      }
    });
    if (total !== Number(proof.targetDurationSeconds)) errors.push(`La suma de planos debe ser ${proof.targetDurationSeconds}; actualmente es ${total}.`);
  }

  const rules = proof.completionRules ?? {};
  if (rules.requiresGeneratedStartFramePerShot !== true) errors.push('Debe exigirse un fotograma generado por plano.');
  if (rules.requiresGeneratedVideoPerShot !== true) errors.push('Debe exigirse un vídeo generado por plano.');
  if (rules.requiresGeneratedDialogueAudio !== true) errors.push('Debe exigirse audio de diálogo generado.');
  if (!Array.isArray(rules.requiresLipSyncForShots) || !rules.requiresLipSyncForShots.includes('PT03')) errors.push('PT03 debe requerir sincronización labial.');
  if (rules.requiresHumanApproval !== true) errors.push('La prueba debe requerir aprobación humana.');
  if (rules.mayBeCalledFinishedWithoutResultUrls !== false) errors.push('No se puede llamar terminada sin URL de resultados.');

  const hasAnyResult = Object.values(proof.results?.startFrames ?? {}).some(Boolean)
    || Object.values(proof.results?.videos ?? {}).some(Boolean)
    || Object.values(proof.results?.audio ?? {}).some(Boolean)
    || Object.values(proof.results?.lipSync ?? {}).some(Boolean)
    || Boolean(proof.results?.assembledPreview);

  if (proof.status === 'approved' && !hasAnyResult) errors.push('Una prueba aprobada debe registrar resultados reales.');
  if (proof.status === 'approved' && proof.approval?.humanApproved !== true) errors.push('status=approved requiere approval.humanApproved=true.');
  if (proof.approval?.humanApproved === true && proof.status !== 'approved') errors.push('Una aprobación humana requiere status=approved.');

  for (const { location, value } of collectStrings(proof)) errors.push(...validateText(value, safetyPolicy, location));
  return errors;
}
