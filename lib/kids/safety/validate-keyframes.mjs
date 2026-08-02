import fs from 'node:fs';
import path from 'node:path';

function missing(value) {
  return value === undefined || value === null || value === '';
}

export function validateKeyframeSet(keyframeSet, storyboard, safetyPolicy, validateText) {
  const errors = [];
  const required = ['id', 'episodeCode', 'storyboardId', 'version', 'status', 'format', 'aspectRatio', 'canvas', 'compositeAsset', 'frames', 'reviewCriteria', 'approval'];
  for (const field of required) if (missing(keyframeSet[field])) errors.push(`Falta el campo obligatorio de keyframes: ${field}`);

  if (!/^S\d{2}E\d{2}$/u.test(String(keyframeSet.episodeCode ?? ''))) errors.push(`episodeCode no válido: ${keyframeSet.episodeCode}`);
  if (!Number.isInteger(keyframeSet.version) || keyframeSet.version < 1) errors.push('version debe ser un entero mayor o igual que 1.');
  if (!['draft', 'review', 'approved', 'superseded'].includes(keyframeSet.status)) errors.push(`Estado de keyframes no permitido: ${keyframeSet.status}`);
  if (keyframeSet.format !== 'svg') errors.push('El primer pase de keyframes debe usar format=svg.');
  if (keyframeSet.aspectRatio !== '16:9') errors.push('aspectRatio debe ser 16:9.');
  if (Number(keyframeSet.canvas?.width) !== 1600 || Number(keyframeSet.canvas?.height) !== 900) errors.push('canvas debe ser 1600x900.');

  const checkAsset = (asset, label) => {
    if (!String(asset ?? '').startsWith('/')) {
      errors.push(`${label} debe ser una ruta pública absoluta.`);
      return;
    }
    const assetPath = path.join('public', String(asset).replace(/^\/+/, ''));
    if (!fs.existsSync(assetPath)) errors.push(`No existe ${label}: ${assetPath}`);
  };
  checkAsset(keyframeSet.compositeAsset, 'compositeAsset');

  const requiredScenes = ['SC01', 'SC02', 'SC14', 'SC16'];
  const frames = keyframeSet.frames;
  if (!Array.isArray(frames) || frames.length < 4) {
    errors.push('El conjunto debe incluir al menos cuatro keyframes.');
  } else {
    const ids = new Set();
    for (const [index, frame] of frames.entries()) {
      if (missing(frame.sceneId) || ids.has(frame.sceneId)) errors.push(`Keyframe ${index + 1}: sceneId ausente o duplicado.`);
      ids.add(frame.sceneId);
      checkAsset(frame.asset, `activo de ${frame.sceneId || index + 1}`);
      if (!storyboard?.scenes?.some((scene) => scene.id === frame.sceneId)) errors.push(`Keyframe ${frame.sceneId}: no existe en el storyboard.`);
      if (!Array.isArray(frame.reviewFocus) || frame.reviewFocus.length < 3) errors.push(`Keyframe ${frame.sceneId}: reviewFocus necesita al menos tres criterios.`);
      if (frame.humanApproved !== false && keyframeSet.status !== 'approved') errors.push(`Keyframe ${frame.sceneId}: no puede aprobarse fuera de status=approved.`);
    }
    for (const sceneId of requiredScenes) if (!ids.has(sceneId)) errors.push(`Falta el keyframe prioritario ${sceneId}.`);
  }

  if (!Array.isArray(keyframeSet.reviewCriteria) || keyframeSet.reviewCriteria.length < 5) errors.push('reviewCriteria necesita al menos cinco criterios globales.');
  if (keyframeSet.approval?.humanApproved === true && keyframeSet.status !== 'approved') errors.push('Un conjunto aprobado por una persona debe usar status=approved.');

  const walk = (value, location = '$') => {
    if (typeof value === 'string') errors.push(...validateText(value, safetyPolicy, location));
    else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${location}[${index}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => walk(item, `${location}.${key}`));
  };
  walk(keyframeSet);
  return errors;
}
