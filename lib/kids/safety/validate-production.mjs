import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function closeEnough(a, b) {
  return Math.abs(Number(a) - Number(b)) < 1e-9;
}

function validateReferencePack(root, referencePack, lock, errors) {
  const jobs = referencePack.jobs || [];
  const jobIds = jobs.map((job) => job.id);
  const uniqueIds = new Set(jobIds);
  const characterSourceById = new Map(lock.characters.map((character) => [character.id, `/${character.path.replace(/^public\//, '')}`]));
  const permittedViews = new Set(lock.permittedViews || []);
  const blockedViews = new Set(lock.blockedViewsUntilApproved || []);

  if (referencePack.status !== 'ready-for-protected-generation') {
    errors.push('El paquete OpenArt debe estar listo para generación protegida.');
  }
  if (referencePack.model?.endpoint !== 'seedream-5.0-edit') {
    errors.push('El paquete OpenArt debe usar seedream-5.0-edit.');
  }
  if (!closeEnough(referencePack.model?.maximumUnitCostUsd, 0.1)) {
    errors.push('El máximo unitario del paquete OpenArt debe ser 0.10 USD.');
  }
  if (!closeEnough(referencePack.budget?.stageCapUsd, 1.25)) {
    errors.push('El tope total del paquete OpenArt debe ser 1.25 USD.');
  }
  if (Number(referencePack.budget?.protectedReserveUsd) < 21.5) {
    errors.push('La reserva protegida del paquete OpenArt no puede ser inferior a 21.50 USD.');
  }
  if (referencePack.budget?.maximumConcurrentPaidRequests !== 1) {
    errors.push('El paquete OpenArt debe limitarse a una solicitud pagada activa.');
  }
  if (referencePack.budget?.automaticRetries !== 0) {
    errors.push('El paquete OpenArt no puede realizar reintentos pagados automáticos.');
  }
  if (referencePack.budget?.quoteEveryJobBeforePurchase !== true) {
    errors.push('Cada referencia debe cotizarse antes de comprarla.');
  }
  if (referencePack.budget?.openArtCreditsMayBeUsed !== false) {
    errors.push('El generador de referencias no puede consumir créditos de OpenArt.');
  }

  if (jobs.length !== 25) errors.push(`El paquete OpenArt debe contener 25 referencias; contiene ${jobs.length}.`);
  if (uniqueIds.size !== jobs.length) errors.push('Los identificadores del paquete OpenArt no pueden repetirse.');

  const calibrationIds = referencePack.calibration?.jobIds || [];
  if (calibrationIds.length !== 2 || !calibrationIds.includes('CHAR-NARA-threeQuarter-v1') || !calibrationIds.includes('CHAR-POMPON-threeQuarter-v1')) {
    errors.push('La calibración debe contener únicamente las referencias de Nara y Pompón en tres cuartos.');
  }
  if (referencePack.calibration?.batchLockedUntilApproved !== true) {
    errors.push('El lote restante debe permanecer bloqueado hasta aprobar la calibración.');
  }
  for (const id of calibrationIds) {
    if (!uniqueIds.has(id)) errors.push(`La calibración referencia un trabajo inexistente: ${id}.`);
  }

  const expectedCost = jobs.length * Number(referencePack.model?.expectedUnitCostUsd || 0);
  if (expectedCost > Number(referencePack.budget?.stageCapUsd || 0)) {
    errors.push('El coste esperado de las referencias supera el tope total.');
  }

  for (const job of jobs) {
    if (!job.id || !job.category || !job.subjectId || !job.view) errors.push('Cada referencia debe declarar id, categoría, sujeto y vista.');
    if (typeof job.prompt !== 'string' || job.prompt.trim().length < 40) errors.push(`${job.id || 'Trabajo sin id'} tiene un prompt insuficiente.`);
    if (job.prompt?.length > Number(referencePack.model?.maximumPromptChars || 0)) errors.push(`${job.id} supera el límite de prompt.`);
    if (typeof job.source !== 'string' || !job.source.startsWith('/lumo-kids/canon/')) {
      errors.push(`${job.id} no utiliza una fuente canónica v4.`);
    } else {
      const localSource = path.join(root, 'public', job.source.replace(/^\//, ''));
      if (!fs.existsSync(localSource)) errors.push(`Falta la fuente de ${job.id}: ${job.source}.`);
    }
    if (!job.imageSize) errors.push(`${job.id} no declara imageSize.`);

    if (job.category === 'characters' && lock.characters.some((character) => character.id === job.subjectId)) {
      if (!permittedViews.has(job.view)) errors.push(`${job.id} solicita una vista no aprobada: ${job.view}.`);
      if (blockedViews.has(job.view)) errors.push(`${job.id} utiliza una vista bloqueada: ${job.view}.`);
      const expectedSource = characterSourceById.get(job.subjectId);
      if (job.source !== expectedSource) errors.push(`${job.id} no usa el maestro v4 bloqueado de ${job.subjectId}.`);
    }
  }

  const characterJobs = jobs.filter((job) => job.category === 'characters' && lock.characters.some((character) => character.id === job.subjectId));
  for (const character of lock.characters) {
    const views = characterJobs.filter((job) => job.subjectId === character.id).map((job) => job.view).sort();
    const expected = [...lock.permittedViews].sort();
    if (JSON.stringify(views) !== JSON.stringify(expected)) {
      errors.push(`${character.id} debe tener exactamente las vistas frontal y tres cuartos en el paquete OpenArt.`);
    }
  }

  const requiredCategories = new Set(['characters', 'environments', 'props', 'secondary-cast']);
  for (const category of requiredCategories) {
    if (!jobs.some((job) => job.category === category)) errors.push(`Falta la categoría ${category} en el paquete OpenArt.`);
  }
}

export function validateLumoProduction(root = process.cwd()) {
  const errors = [];
  const lock = readJson(root, 'config/lumo-canon-lock-v4.json');
  const policy = readJson(root, 'config/lumo-tool-policy-v1.json');
  const characterPolicy = readJson(root, 'config/character-consistency.json');
  const budget = readJson(root, 'content/production/budget-v1.json');
  const episode = readJson(root, 'content/production/S01E01-microepisode-plan-v1.json');
  const proof = readJson(root, 'content/production/jobs/S01E01-proof-v1.json');
  const release = readJson(root, 'content/production/youtube-release-gate-v1.json');
  const referencePack = readJson(root, 'content/production/Lumo-OpenArt-reference-pack-v1.json');

  for (const entry of [lock.master, lock.world, ...lock.characters]) {
    const file = path.join(root, entry.path);
    if (!fs.existsSync(file)) {
      errors.push(`Falta el activo bloqueado ${entry.path}.`);
      continue;
    }
    const actual = fileSha256(file);
    if (actual !== entry.sha256) errors.push(`Deriva de canon en ${entry.path}: ${actual}.`);
  }

  if (lock.characters.length !== 6 || new Set(lock.characters.map((item) => item.id)).size !== 6) {
    errors.push('El bloqueo debe contener exactamente seis protagonistas únicos.');
  }
  if (JSON.stringify(lock.permittedViews) !== JSON.stringify(['front', 'threeQuarter'])) {
    errors.push('Solo se permiten las vistas frontal y tres cuartos.');
  }
  if (JSON.stringify(characterPolicy.requiredViews) !== JSON.stringify(lock.permittedViews)) {
    errors.push('La política de personajes no coincide con las vistas del bloqueo canónico.');
  }

  for (const character of lock.characters) {
    const profile = readJson(root, `content/characters/profiles/${character.id}.json`);
    if (profile.canonicalSourceVersion !== 4) errors.push(`${character.id} no usa la fuente v4.`);
    if (JSON.stringify(profile.designSheet?.requiredViews) !== JSON.stringify(lock.permittedViews)) {
      errors.push(`${character.id} solicita vistas no aprobadas.`);
    }
  }

  const allocation = budget.allocation || {};
  if (!closeEnough(budget.confirmedBalance, 20.67)) errors.push('El saldo confirmado debe ser 20.67 USD.');
  if (!closeEnough(allocation.microepisode60SecondsMaximum + allocation.protectedReserve, budget.confirmedBalance)) {
    errors.push('El máximo del microepisodio y la reserva no cuadran con el saldo confirmado.');
  }
  if (budget.balanceState !== 'user-confirmed-not-live-api') errors.push('El saldo histórico no puede presentarse como lectura viva.');

  const sections = episode.sections || [];
  if (episode.durationSeconds !== 60 || sections.length !== 4) errors.push('El microepisodio debe tener cuatro secciones y 60 segundos.');
  for (let index = 0; index < sections.length; index += 1) {
    const expectedStart = index === 0 ? 0 : sections[index - 1].end;
    if (sections[index].start !== expectedStart || sections[index].end <= sections[index].start) {
      errors.push(`La sección ${sections[index].id} crea un hueco o solapamiento.`);
    }
  }
  if (sections.at(-1)?.end !== episode.durationSeconds) errors.push('Las secciones no cubren la duración completa.');

  const proofDuration = (proof.jobs || []).reduce((total, job) => total + job.durationSeconds, 0);
  if (proofDuration !== 25 || proof.totalDurationSeconds !== 25) errors.push('La prueba protegida debe durar 25 segundos.');
  if (!closeEnough(proof.stageCap, allocation.proof25SecondsMaximum)) errors.push('El tope de la prueba no coincide con el presupuesto.');
  if (proof.executionPolicy?.maximumConcurrentPaidRequests !== 1) errors.push('Solo puede existir una solicitud pagada activa.');
  for (const job of proof.jobs || []) {
    if (job.maximumCost > budget.maximumPerGeneration) errors.push(`${job.id} supera el máximo por generación.`);
    for (const reference of job.references || []) {
      if (!reference.startsWith('/lumo-kids/canon/')) errors.push(`${job.id} usa una referencia no canónica.`);
    }
  }

  validateReferencePack(root, referencePack, lock, errors);

  if (policy.caveman?.mode !== 'lite' || !policy.caveman?.forbiddenCommands?.includes('compress')) {
    errors.push('Caveman debe permanecer en lite y sin compress.');
  }
  if (policy.graphify?.authority !== 'derived' || policy.graphify?.mayRedefineCanon !== false) {
    errors.push('Graphify debe ser memoria derivada sin autoridad canónica.');
  }
  if (policy.openGenerativeAi?.maximumConcurrentPaidRequests !== 1) errors.push('La política de MuAPI debe imponer una sola compra activa.');

  if (release.uploadDefaults?.privacyStatus !== 'private') errors.push('La carga inicial de YouTube debe ser privada.');
  if (release.uploadDefaults?.madeForKids !== true) errors.push('YouTube debe marcar el contenido como dirigido a niños.');
  if (release.uploadDefaults?.containsSyntheticMedia !== true) errors.push('Debe declararse el contenido sintético.');
  if (!release.requiredChecks?.includes('Yariel-approved-final-master')) errors.push('Falta la aprobación final del propietario.');

  return errors;
}
