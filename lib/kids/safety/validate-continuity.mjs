import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

function requiredString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} debe ser un texto no vacío.`);
}

function requiredArray(value, label, errors) {
  if (!Array.isArray(value) || value.length === 0) errors.push(`${label} debe ser una lista no vacía.`);
}

function duplicates(values = []) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export function validateContinuityManifest(manifest) {
  const errors = [];
  requiredString(manifest?.id, 'id', errors);
  if (manifest?.status !== 'canonical') errors.push('status debe ser canonical.');
  if (!Number.isInteger(manifest?.version) || manifest.version < 1) errors.push('version debe ser un entero positivo.');
  requiredArray(manifest?.characterProfiles, 'characterProfiles', errors);
  requiredArray(manifest?.sectionContracts, 'sectionContracts', errors);
  requiredString(manifest?.characterDesignSource?.asset, 'characterDesignSource.asset', errors);
  requiredString(manifest?.characterDesignSource?.sha256, 'characterDesignSource.sha256', errors);
  if (manifest?.characterDesignSource?.asset) {
    const sourcePath = path.join('public', manifest.characterDesignSource.asset.replace(/^\/+/, ''));
    if (!fs.existsSync(sourcePath)) errors.push(`La fuente maestra no existe: ${sourcePath}`);
    else {
      const actualSha = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
      if (actualSha !== manifest.characterDesignSource.sha256) errors.push('El SHA-256 de la fuente maestra no coincide.');
    }
  }

  const assets = manifest?.canonicalAssets;
  if (!assets || typeof assets !== 'object') {
    errors.push('canonicalAssets es obligatorio.');
  } else {
    for (const key of ['environments', 'props', 'voices', 'secondaryCast', 'visualSheets']) {
      requiredArray(assets[key], `canonicalAssets.${key}`, errors);
    }
  }

  const policy = manifest?.generationPolicy;
  if (!policy) {
    errors.push('generationPolicy es obligatorio.');
  } else {
    if (policy.sectionDurationSeconds !== 15) errors.push('generationPolicy.sectionDurationSeconds debe ser 15.');
    if (policy.promptHardLimitChars !== 10000) errors.push('generationPolicy.promptHardLimitChars debe ser 10000.');
    if (!Number.isInteger(policy.promptTargetMaxChars) || policy.promptTargetMaxChars <= 0 || policy.promptTargetMaxChars >= 10000) {
      errors.push('generationPolicy.promptTargetMaxChars debe ser un entero entre 1 y 9999.');
    }
    if (!Number.isInteger(policy.maxConsecutiveExtensions) || policy.maxConsecutiveExtensions < 1 || policy.maxConsecutiveExtensions > 3) {
      errors.push('generationPolicy.maxConsecutiveExtensions debe estar entre 1 y 3.');
    }
    if (policy.useEpisodeOverviewAsGenerationReference !== false) {
      errors.push('El storyboard general no debe usarse como referencia de generación.');
    }
  }

  const referencedFiles = [
    ...(manifest?.characterProfiles || []),
    ...(manifest?.sectionContracts || []),
    ...(assets?.environments || []),
    ...(assets?.props || []),
    ...(assets?.voices || []),
    ...(assets?.secondaryCast || []),
    ...(assets?.visualSheets || []),
  ];
  for (const file of referencedFiles) {
    if (typeof file === 'string' && !fs.existsSync(file)) errors.push(`La referencia no existe: ${file}`);
  }
  return errors;
}

export function validateCanonicalVisualRegistry(registry) {
  const errors = [];
  requiredString(registry?.id, 'id', errors);
  if (registry?.version !== 4) errors.push('version debe ser 4.');
  if (registry?.status !== 'canonical-v4') errors.push('status debe ser canonical-v4.');
  requiredString(registry?.sourceMaster?.path, 'sourceMaster.path', errors);
  requiredString(registry?.sourceMaster?.sha256, 'sourceMaster.sha256', errors);
  requiredArray(registry?.activeAssets, 'activeAssets', errors);

  const masterPath = registry?.sourceMaster?.path;
  if (masterPath) {
    const repositoryPath = path.join('public', masterPath.replace(/^\/+/, ''));
    if (!fs.existsSync(repositoryPath)) errors.push(`No existe sourceMaster: ${repositoryPath}`);
    else {
      const actualSha = createHash('sha256').update(fs.readFileSync(repositoryPath)).digest('hex');
      if (actualSha !== registry.sourceMaster.sha256) errors.push('sourceMaster.sha256 no coincide con el archivo.');
    }
  }

  const requiredIds = ['DESIGN-MASTER-V4', 'CHAR-LUMO-V4', 'CHAR-NARA-V4', 'CHAR-TUNO-V4', 'CHAR-BIRI-V4', 'CHAR-POMPON-V4', 'CHAR-NUBLO-V4'];
  const assetIds = new Set((registry?.activeAssets || []).map((asset) => asset.id));
  for (const id of requiredIds) if (!assetIds.has(id)) errors.push(`Falta el activo visual obligatorio ${id}.`);
  for (const asset of registry?.activeAssets || []) {
    requiredString(asset?.id, 'activeAssets[].id', errors);
    requiredString(asset?.path, `${asset?.id || 'asset'}.path`, errors);
    const repositoryPath = path.join('public', String(asset?.path || '').replace(/^\/+/, ''));
    if (asset?.path && !fs.existsSync(repositoryPath)) errors.push(`No existe el activo visual: ${repositoryPath}`);
  }
  return errors;
}

export function validateCanonicalContinuityAsset(asset, file) {
  const errors = [];
  requiredString(asset?.id, 'id', errors);
  if (!Number.isInteger(asset?.version) || asset.version < 1) errors.push('version debe ser un entero positivo.');
  if (asset?.status !== 'canonical') errors.push('status debe ser canonical.');

  if (file.includes('/environments/')) {
    requiredArray(asset?.invariants, 'invariants', errors);
    requiredArray(asset?.requiredReferenceViews, 'requiredReferenceViews', errors);
    requiredString(asset?.promptFragment, 'promptFragment', errors);
    requiredArray(asset?.negativePrompt, 'negativePrompt', errors);
  }

  if (file.includes('/props/')) {
    requiredArray(asset?.components, 'components', errors);
    const componentIds = asset?.components?.map((component) => component.id) || [];
    for (const id of ['PROP-FOUNTAIN-OF-LIGHT-001', 'PROP-HEART-OF-LIGHT-001']) {
      if (!componentIds.includes(id)) errors.push(`Falta el componente canónico ${id}.`);
    }
    for (const component of asset?.components || []) {
      requiredString(component?.id, 'components[].id', errors);
      requiredArray(component?.invariants, `${component?.id || 'component'}.invariants`, errors);
      requiredString(component?.promptFragment, `${component?.id || 'component'}.promptFragment`, errors);
      requiredArray(component?.negativePrompt, `${component?.id || 'component'}.negativePrompt`, errors);
    }
    requiredArray(asset?.validStatePairs, 'validStatePairs', errors);
  }

  if (file.includes('/voices/')) {
    requiredArray(asset?.voices, 'voices', errors);
    const voiceIds = asset?.voices?.map((voice) => voice.id) || [];
    for (const id of ['VOICE-NARRATOR-001', 'VOICE-LUMO-001', 'VOICE-NARA-001', 'VOICE-TUNO-001', 'VOICE-BIRI-001', 'VOICE-POMPON-001', 'VOICE-NUBLO-001']) {
      if (!voiceIds.includes(id)) errors.push(`Falta la voz canónica ${id}.`);
    }
    for (const voice of asset?.voices || []) {
      requiredString(voice?.id, 'voices[].id', errors);
      requiredString(voice?.character, `${voice?.id || 'voice'}.character`, errors);
      requiredArray(voice?.tone, `${voice?.id || 'voice'}.tone`, errors);
      requiredArray(voice?.avoid, `${voice?.id || 'voice'}.avoid`, errors);
    }
  }

  if (file.includes('/cast/')) {
    requiredArray(asset?.antiCloneRules, 'antiCloneRules', errors);
    if ((asset?.antiCloneRules || []).length < 6) errors.push('Se requieren al menos seis reglas anticlones.');
    requiredArray(asset?.citizens, 'citizens', errors);
    if ((asset?.citizens || []).length < 6) errors.push('Se requieren al menos seis diseños secundarios distintos.');
    const citizenIds = asset?.citizens?.map((citizen) => citizen.id) || [];
    if (duplicates(citizenIds).length) errors.push('Los identificadores de secundarios no pueden repetirse.');
    for (const citizen of asset?.citizens || []) {
      requiredString(citizen?.id, 'citizens[].id', errors);
      requiredString(citizen?.species, `${citizen?.id || 'citizen'}.species`, errors);
      requiredString(citizen?.silhouette, `${citizen?.id || 'citizen'}.silhouette`, errors);
      requiredArray(citizen?.palette, `${citizen?.id || 'citizen'}.palette`, errors);
      requiredArray(citizen?.notLike, `${citizen?.id || 'citizen'}.notLike`, errors);
    }
    const canonicalCitizenIds = new Set(asset?.citizens?.map((citizen) => citizen.id) || []);
    for (const id of ['SEC-LIRA-RABBIT-001', 'SEC-TORI-FOX-001', 'SEC-MILO-RACCOON-001', 'SEC-SILA-SQUIRREL-001', 'SEC-OLMO-OWL-001', 'SEC-FLO-FLAMINGO-001']) {
      if (!canonicalCitizenIds.has(id)) errors.push(`Falta el secundario de Character Design v4 ${id}.`);
    }
    requiredArray(asset?.futureAntagonists, 'futureAntagonists', errors);
    if ((asset?.futureAntagonists || []).length !== 5) errors.push('Character Design v4 define exactamente cinco antagonistas futuros.');
  }

  return errors;
}

export function validateSectionContract(section, knownCharacters, canonicalIds) {
  const errors = [];
  requiredString(section?.id, 'id', errors);
  requiredString(section?.episodeId, 'episodeId', errors);
  requiredString(section?.title, 'title', errors);
  requiredString(section?.storyPurpose, 'storyPurpose', errors);
  if (section?.durationSeconds !== 15) errors.push('durationSeconds debe ser 15.');
  if (!Number.isInteger(section?.sectionNumber) || section.sectionNumber < 1) errors.push('sectionNumber debe ser un entero positivo.');

  const rescueMode = section?.sectionMode === 'environment-only-editorial-rescue';
  const present = section?.charactersPresent || [];
  const forbidden = section?.charactersForbidden || [];

  if (rescueMode) {
    if (!Array.isArray(section?.charactersPresent)) errors.push('charactersPresent debe ser una lista.');
    if (present.length !== 0) errors.push('Una sección environment-only-editorial-rescue no puede declarar protagonistas visibles.');
    const requiredForbidden = ['lumo', 'nara', 'tuno', 'biri', 'pompon', 'nublo'];
    const missingForbidden = requiredForbidden.filter((id) => !forbidden.includes(id));
    if (missingForbidden.length) errors.push(`El rescate ambiental debe prohibir todo el reparto principal: ${missingForbidden.join(', ')}.`);
    if (section?.generation?.paidGenerationAllowed !== false) errors.push('El rescate editorial debe bloquear la generación pagada.');
    if (section?.generation?.estimatedAdditionalCostUsd !== 0) errors.push('El coste adicional del rescate debe ser 0.');
    requiredString(section?.references?.approvedResultAsset, 'references.approvedResultAsset', errors);
  } else {
    requiredArray(section?.charactersPresent, 'charactersPresent', errors);
  }

  if (!Array.isArray(section?.charactersForbidden)) errors.push('charactersForbidden debe ser una lista.');

  const overlap = present.filter((id) => forbidden.includes(id));
  if (overlap.length) errors.push(`Personajes presentes y prohibidos a la vez: ${overlap.join(', ')}.`);
  if (duplicates(present).length) errors.push('charactersPresent contiene duplicados.');
  for (const id of [...present, ...forbidden]) {
    if (!knownCharacters.has(id)) errors.push(`Personaje desconocido: ${id}.`);
  }

  const references = section?.references;
  if (!references) {
    errors.push('references es obligatorio.');
  } else {
    requiredString(references.storyboardAsset, 'references.storyboardAsset', errors);
    requiredString(references.castSheetAsset, 'references.castSheetAsset', errors);
    requiredArray(references.environmentIds, 'references.environmentIds', errors);
    requiredArray(references.propIds, 'references.propIds', errors);
    requiredString(references.voiceBibleId, 'references.voiceBibleId', errors);
    for (const id of [...(references.environmentIds || []), ...(references.propIds || []), references.voiceBibleId]) {
      if (id && !canonicalIds.has(id)) errors.push(`Referencia canónica desconocida: ${id}.`);
    }
  }

  const state = section?.propState;
  if (!state) {
    errors.push('propState es obligatorio.');
  } else {
    const fountainStates = new Set(['on', 'dim', 'off', 'restoring']);
    const heartStates = new Set(['safe-floating', 'being-stolen', 'carried', 'being-returned', 'restored']);
    if (!fountainStates.has(state.fountainState)) errors.push(`fountainState inválido: ${state.fountainState}.`);
    if (!heartStates.has(state.heartState)) errors.push(`heartState inválido: ${state.heartState}.`);
  }

  requiredString(section?.startState, 'startState', errors);
  requiredString(section?.endState, 'endState', errors);
  requiredArray(section?.shots, 'shots', errors);
  const shots = section?.shots || [];
  if (shots.length) {
    const sorted = [...shots].sort((a, b) => a.start - b.start);
    if (sorted[0]?.start !== 0) errors.push('El primer plano debe comenzar en 0.');
    if (sorted.at(-1)?.end !== 15) errors.push('El último plano debe terminar en 15.');
    for (let index = 0; index < sorted.length; index++) {
      const shot = sorted[index];
      if (!Number.isFinite(shot.start) || !Number.isFinite(shot.end) || shot.end <= shot.start) errors.push(`Plano ${index + 1} tiene tiempos inválidos.`);
      requiredString(shot.action, `shots[${index}].action`, errors);
      if (index > 0 && sorted[index - 1].end !== shot.start) errors.push(`Hay un hueco o solapamiento antes del plano ${index + 1}.`);
    }
  }

  const budget = section?.promptBudget;
  if (!budget) {
    errors.push('promptBudget es obligatorio.');
  } else {
    if (budget.hardLimitChars !== 10000) errors.push('promptBudget.hardLimitChars debe ser 10000.');
    if (!Number.isInteger(budget.targetMaxChars) || budget.targetMaxChars <= 0 || budget.targetMaxChars >= 10000) {
      errors.push('promptBudget.targetMaxChars debe estar entre 1 y 9999.');
    }
  }

  if (section?.humanApprovalRequired !== true) errors.push('humanApprovalRequired debe ser true.');

  const dialogue = section?.audio?.principalDialogue || [];
  let previousEnd = 0;
  for (const line of dialogue) {
    requiredString(line?.speaker, 'principalDialogue[].speaker', errors);
    requiredString(line?.text, 'principalDialogue[].text', errors);
    if (!Number.isFinite(line.startSeconds) || !Number.isFinite(line.endSeconds) || line.endSeconds <= line.startSeconds || line.endSeconds > 15) {
      errors.push(`Diálogo con tiempos inválidos: ${line?.text || 'sin texto'}.`);
    }
    if (line.startSeconds < previousEnd) errors.push(`Diálogo solapado: ${line?.text || 'sin texto'}.`);
    previousEnd = Math.max(previousEnd, line.endSeconds || 0);
    requiredString(line?.gesture, 'principalDialogue[].gesture', errors);
    requiredString(line?.listenerReaction, 'principalDialogue[].listenerReaction', errors);
  }

  return errors;
}
