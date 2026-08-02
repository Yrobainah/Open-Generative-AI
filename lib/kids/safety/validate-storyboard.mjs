import { validateText } from './validate.mjs';

const ALLOWED_STATUSES = ['draft', 'review', 'approved'];
const ALLOWED_CHARACTERS = new Set(['Lumo', 'Nara', 'Tuno', 'Biri', 'Pompón', 'Nublo']);
const REQUIRED_SCENE_FIELDS = [
  'id',
  'startSecond',
  'endSecond',
  'title',
  'purpose',
  'location',
  'characters',
  'emotionalBeat',
  'shot',
  'camera',
  'action',
  'dialogue',
  'audio',
  'lighting',
  'assets',
  'continuity',
  'retentionDevice',
  'generationPrompt',
];

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function collectStrings(value, location = '$', output = []) {
  if (typeof value === 'string') output.push({ location, value });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${location}[${index}]`, output));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectStrings(item, `${location}.${key}`, output);
  }
  return output;
}

function collectAssetIds(registry) {
  const ids = new Set();
  for (const group of Object.values(registry ?? {})) {
    if (!Array.isArray(group)) continue;
    for (const asset of group) {
      if (asset?.id) ids.add(asset.id);
    }
  }
  return ids;
}

export function validateStoryboard(storyboard, safetyPolicy) {
  const errors = [];
  const requiredFields = [
    'id',
    'episodeCode',
    'version',
    'status',
    'title',
    'targetDurationSeconds',
    'aspectRatio',
    'frameRate',
    'language',
    'visualStyle',
    'characterReferences',
    'productionRules',
    'assetRegistry',
    'scenes',
    'approval',
  ];

  for (const field of requiredFields) {
    if (isMissing(storyboard[field])) errors.push(`Falta el campo obligatorio de storyboard: ${field}`);
  }

  if (!/^S\d{2}E\d{2}$/u.test(String(storyboard.episodeCode ?? ''))) {
    errors.push(`episodeCode de storyboard no válido: ${storyboard.episodeCode}`);
  }

  if (!Number.isInteger(storyboard.version) || storyboard.version < 1) {
    errors.push('La versión del storyboard debe ser un entero mayor o igual que 1.');
  }

  if (!ALLOWED_STATUSES.includes(storyboard.status)) {
    errors.push(`Estado de storyboard no permitido: ${storyboard.status}`);
  }

  const targetDuration = Number(storyboard.targetDurationSeconds);
  if (!Number.isFinite(targetDuration) || targetDuration < 240 || targetDuration > 360) {
    errors.push('targetDurationSeconds del storyboard debe estar entre 240 y 360.');
  }

  if (storyboard.aspectRatio !== '16:9') errors.push('El storyboard principal debe usar aspectRatio=16:9.');
  if (![24, 25, 30].includes(Number(storyboard.frameRate))) errors.push('frameRate debe ser 24, 25 o 30.');
  if (storyboard.productionRules?.safeAction !== true) errors.push('productionRules.safeAction debe ser true.');
  if (storyboard.productionRules?.humanReviewRequired !== true) errors.push('productionRules.humanReviewRequired debe ser true.');

  const referenceNames = new Set(Object.keys(storyboard.characterReferences ?? {}));
  for (const character of ALLOWED_CHARACTERS) {
    if (!referenceNames.has(character)) errors.push(`Falta la referencia maestra del personaje ${character}.`);
  }

  const assetIds = collectAssetIds(storyboard.assetRegistry);
  if (assetIds.size < 10) errors.push('assetRegistry debe declarar al menos diez recursos reutilizables.');

  const scenes = storyboard.scenes;
  if (!Array.isArray(scenes) || scenes.length < 12) {
    errors.push('El storyboard debe incluir al menos doce escenas.');
  } else {
    const sceneIds = new Set();
    let previousEnd = 0;

    scenes.forEach((scene, index) => {
      const label = `Escena ${index + 1}`;
      for (const field of REQUIRED_SCENE_FIELDS) {
        if (isMissing(scene[field])) errors.push(`${label}: falta ${field}.`);
      }

      if (!/^SC\d{2}$/u.test(String(scene.id ?? ''))) errors.push(`${label}: id no válido; debe usar SC01, SC02, etc.`);
      if (sceneIds.has(scene.id)) errors.push(`${label}: id duplicado ${scene.id}.`);
      sceneIds.add(scene.id);

      const expectedId = `SC${String(index + 1).padStart(2, '0')}`;
      if (scene.id !== expectedId) errors.push(`${label}: se esperaba el id ${expectedId}.`);

      const start = Number(scene.startSecond);
      const end = Number(scene.endSecond);
      const duration = end - start;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
        errors.push(`${label}: intervalo temporal no válido.`);
      }
      if (start !== previousEnd) errors.push(`${label}: debe comenzar en ${previousEnd} para mantener continuidad.`);
      if (Number.isFinite(duration) && (duration < 4 || duration > 30)) {
        errors.push(`${label}: la duración debe estar entre 4 y 30 segundos.`);
      }
      previousEnd = end;

      if (!Array.isArray(scene.characters) || scene.characters.length === 0) {
        errors.push(`${label}: debe incluir al menos un personaje.`);
      } else {
        for (const character of scene.characters) {
          if (!ALLOWED_CHARACTERS.has(character)) errors.push(`${label}: personaje no reconocido: ${character}.`);
          if (!referenceNames.has(character)) errors.push(`${label}: ${character} no tiene referencia maestra.`);
        }
      }

      if (!scene.shot?.size || !scene.shot?.angle || !scene.shot?.composition) {
        errors.push(`${label}: shot debe declarar size, angle y composition.`);
      }
      if (!scene.camera?.movement || !scene.camera?.transitionIn || !scene.camera?.transitionOut) {
        errors.push(`${label}: camera debe declarar movement, transitionIn y transitionOut.`);
      }
      if (!scene.audio?.music || !Array.isArray(scene.audio?.sfx) || isMissing(scene.audio?.ambience)) {
        errors.push(`${label}: audio debe declarar music, sfx y ambience.`);
      }

      if (!Array.isArray(scene.dialogue) || scene.dialogue.length === 0) {
        errors.push(`${label}: debe contener al menos una línea de diálogo o canción.`);
      } else {
        scene.dialogue.forEach((line, lineIndex) => {
          if (!line?.speaker || !line?.text || !line?.direction) {
            errors.push(`${label}, diálogo ${lineIndex + 1}: faltan speaker, text o direction.`);
          }
        });
      }

      if (!Array.isArray(scene.assets) || scene.assets.length === 0) {
        errors.push(`${label}: debe declarar al menos un recurso.`);
      } else {
        for (const assetId of scene.assets) {
          if (!assetIds.has(assetId)) errors.push(`${label}: recurso no declarado en assetRegistry: ${assetId}.`);
        }
      }

      if (String(scene.generationPrompt ?? '').length < 60) {
        errors.push(`${label}: generationPrompt debe tener al menos 60 caracteres.`);
      }
    });

    if (Number(scenes[0]?.startSecond) !== 0) errors.push('La primera escena debe comenzar en el segundo 0.');
    if (previousEnd !== targetDuration) errors.push('La última escena debe terminar exactamente en targetDurationSeconds.');
  }

  const hasRonda = scenes?.some((scene) => String(scene.title).includes('Ronda'));
  const hasResolution = scenes?.some((scene) => Number(scene.startSecond) >= 237 && String(scene.purpose).toLowerCase().includes('resol'));
  if (!hasRonda) errors.push('El storyboard debe incluir una escena identificable de La Ronda de las Ideas.');
  if (!hasResolution) errors.push('El storyboard debe incluir una resolución después del segundo 237.');

  if (storyboard.approval?.humanApproved === true && storyboard.status !== 'approved') {
    errors.push('Un storyboard aprobado por una persona debe usar status=approved.');
  }
  if (storyboard.status === 'approved' && storyboard.approval?.humanApproved !== true) {
    errors.push('Un storyboard con status=approved requiere approval.humanApproved=true.');
  }

  for (const { location, value } of collectStrings(storyboard)) {
    errors.push(...validateText(value, safetyPolicy, location));
  }

  return errors;
}
