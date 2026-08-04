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

export function validateLumoProduction(root = process.cwd()) {
  const errors = [];
  const lock = readJson(root, 'config/lumo-canon-lock-v4.json');
  const policy = readJson(root, 'config/lumo-tool-policy-v1.json');
  const characterPolicy = readJson(root, 'config/character-consistency.json');
  const budget = readJson(root, 'content/production/budget-v1.json');
  const episode = readJson(root, 'content/production/S01E01-microepisode-plan-v1.json');
  const proof = readJson(root, 'content/production/jobs/S01E01-proof-v1.json');
  const release = readJson(root, 'content/production/youtube-release-gate-v1.json');

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
