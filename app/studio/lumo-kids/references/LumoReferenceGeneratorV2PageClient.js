'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import pack from '../../../../content/production/Lumo-OpenArt-reference-pack-v1.json';
import {
  buildGenerationPayload,
  clearPersistedState,
  deleteGeneratedBlob,
  downloadBlob,
  ensureHostedSource,
  fetchGeneratedImageBlob,
  getGeneratedBlob,
  getLiveBalance,
  getStoredMuapiKey,
  persistState,
  pollReferenceJob,
  putGeneratedBlob,
  quoteReferenceJob,
  readPersistedState,
  safeFileName,
  submitReferenceJob,
} from '../../../../lib/kids/production/reference-pack-client';

const JOB_DEFAULTS = {
  status: 'pending',
  quote: null,
  requestId: null,
  outputUrl: null,
  chargedRequestId: null,
  cost: null,
  approved: false,
  rejected: false,
  blobStored: false,
  error: null,
  progress: null,
  generatedAt: null,
};

function finite(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function usd(value) {
  return finite(value) ? `$${Number(value).toFixed(4)}` : '—';
}

function freshState() {
  return {
    version: 2,
    phase: 'idle',
    startingBalance: null,
    currentBalance: null,
    spent: 0,
    activeJobId: null,
    chargedRequestIds: [],
    message: 'Comprueba el saldo vivo antes de iniciar la calibración.',
    jobs: Object.fromEntries(pack.jobs.map((job) => [job.id, { ...JOB_DEFAULTS }])),
    audit: [],
  };
}

function restoreState(saved) {
  const base = freshState();
  if (!saved || saved.version !== base.version) return base;
  return {
    ...base,
    ...saved,
    activeJobId: saved.activeJobId || null,
    chargedRequestIds: Array.isArray(saved.chargedRequestIds) ? saved.chargedRequestIds : [],
    audit: Array.isArray(saved.audit) ? saved.audit : [],
    jobs: Object.fromEntries(pack.jobs.map((job) => [
      job.id,
      { ...JOB_DEFAULTS, ...(saved.jobs?.[job.id] || {}) },
    ])),
  };
}

function statusLabel(status) {
  return {
    pending: 'pendiente',
    preparing: 'preparando',
    quoted: 'cotizada',
    generating: 'generando',
    preserving: 'guardando',
    completed: 'por revisar',
    approved: 'aprobada',
    rejected: 'rechazada',
    failed: 'falló',
    'preservation-failed': 'guardar de nuevo',
  }[status] || status;
}

function StatusPill({ status }) {
  const color = {
    pending: 'border-white/10 bg-white/[.03] text-white/40',
    preparing: 'border-cyan-300/20 bg-cyan-300/[.06] text-cyan-100',
    quoted: 'border-sky-300/20 bg-sky-300/[.06] text-sky-100',
    generating: 'border-amber-300/20 bg-amber-300/[.07] text-amber-100',
    preserving: 'border-violet-300/20 bg-violet-300/[.07] text-violet-100',
    completed: 'border-violet-300/20 bg-violet-300/[.07] text-violet-100',
    approved: 'border-emerald-300/20 bg-emerald-300/[.08] text-emerald-100',
    rejected: 'border-red-300/20 bg-red-300/[.07] text-red-100',
    failed: 'border-red-300/20 bg-red-300/[.07] text-red-100',
    'preservation-failed': 'border-orange-300/20 bg-orange-300/[.07] text-orange-100',
  }[status] || 'border-white/10 bg-white/[.03] text-white/40';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${color}`}>{statusLabel(status)}</span>;
}

function Metric({ label, value, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-black/20 px-4 py-3 text-center">
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}

async function textDownload(text, name) {
  await downloadBlob(new Blob([text], { type: 'application/json' }), name);
}

async function makeContactSheet(jobs, blobs) {
  const columns = 5;
  const cellWidth = 400;
  const imageHeight = 270;
  const labelHeight = 50;
  const rows = Math.ceil(jobs.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellWidth;
  canvas.height = Math.max(1, rows) * (imageHeight + labelHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la hoja de revisión.');
  context.fillStyle = '#090b10';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.font = 'bold 14px Arial';

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const blob = blobs[job.id];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * cellWidth;
    const y = row * (imageHeight + labelHeight);
    context.fillStyle = '#030407';
    context.fillRect(x, y, cellWidth, imageHeight);
    if (blob) {
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(cellWidth / bitmap.width, imageHeight / bitmap.height);
      const width = bitmap.width * scale;
      const height = bitmap.height * scale;
      context.drawImage(bitmap, x + (cellWidth - width) / 2, y + (imageHeight - height) / 2, width, height);
      bitmap.close();
    }
    context.fillStyle = '#121722';
    context.fillRect(x, y + imageHeight, cellWidth, labelHeight);
    context.fillStyle = '#eaf8ff';
    context.fillText(job.id.slice(0, 45), x + 12, y + imageHeight + labelHeight / 2);
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo codificar la hoja de revisión.')), 'image/png');
  });
}

export default function LumoReferenceGeneratorV2PageClient() {
  const router = useRouter();
  const stateRef = useRef(freshState());
  const objectUrlsRef = useRef({});
  const runningRef = useRef(false);
  const [state, setState] = useState(freshState);
  const [previews, setPreviews] = useState({});
  const [category, setCategory] = useState('all');
  const [confirmRegeneration, setConfirmRegeneration] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const commit = useCallback((updater) => {
    const current = stateRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    stateRef.current = next;
    setState(next);
    try { persistState(next); } catch { /* browser storage is optional */ }
    return next;
  }, []);

  const updateJob = useCallback((jobId, patch) => {
    return commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: { ...current.jobs[jobId], ...patch },
      },
    }));
  }, [commit]);

  const audit = useCallback((event, detail = {}) => {
    commit((current) => ({
      ...current,
      audit: [...current.audit, { event, at: new Date().toISOString(), ...detail }].slice(-600),
    }));
  }, [commit]);

  const setPreview = useCallback((jobId, blob) => {
    if (objectUrlsRef.current[jobId]) URL.revokeObjectURL(objectUrlsRef.current[jobId]);
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current[jobId] = url;
    setPreviews((current) => ({ ...current, [jobId]: url }));
  }, []);

  useEffect(() => {
    const restored = restoreState(readPersistedState());
    stateRef.current = restored;
    setState(restored);
    let alive = true;
    Promise.all(pack.jobs.map(async (job) => {
      const blob = await getGeneratedBlob(job.id).catch(() => null);
      if (alive && blob instanceof Blob) setPreview(job.id, blob);
    })).finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [setPreview]);

  const calibrationJobs = useMemo(
    () => pack.calibration.jobIds.map((id) => pack.jobs.find((job) => job.id === id)).filter(Boolean),
    [],
  );
  const remainingJobs = useMemo(
    () => pack.jobs.filter((job) => !pack.calibration.jobIds.includes(job.id)),
    [],
  );
  const categories = useMemo(() => ['all', ...new Set(pack.jobs.map((job) => job.category))], []);
  const visibleJobs = useMemo(
    () => category === 'all' ? pack.jobs : pack.jobs.filter((job) => job.category === category),
    [category],
  );

  const approvedCount = pack.jobs.filter((job) => state.jobs[job.id]?.approved).length;
  const generatedCount = pack.jobs.filter((job) => Boolean(state.jobs[job.id]?.outputUrl)).length;
  const calibrationApproved = calibrationJobs.every((job) => state.jobs[job.id]?.approved);
  const allApproved = approvedCount === pack.jobs.length;
  const rejectedJobs = pack.jobs.filter((job) => state.jobs[job.id]?.rejected);
  const requestJob = pack.jobs.find((job) => state.jobs[job.id]?.requestId);
  const activeRequestExists = Boolean(state.activeJobId || requestJob);
  const busy = runningRef.current || ['preflight', 'generating'].includes(state.phase) || activeRequestExists;

  const requireKey = () => {
    const key = getStoredMuapiKey();
    if (!key) throw new Error('No se encontró la clave MuAPI guardada. Configúrala en Settings; no la pegues aquí.');
    return key;
  };

  const checkBalance = useCallback(async () => {
    try {
      const balance = await getLiveBalance(requireKey());
      commit((current) => ({
        ...current,
        startingBalance: finite(current.startingBalance) ? current.startingBalance : balance,
        currentBalance: balance,
        message: `Saldo vivo verificado: ${usd(balance)}.`,
      }));
    } catch (error) {
      commit((current) => ({ ...current, phase: 'stopped', message: error instanceof Error ? error.message : 'No se pudo comprobar el saldo.' }));
    }
  }, [commit]);

  const prepareJob = useCallback(async (job, apiKey) => {
    updateJob(job.id, { status: 'preparing', error: null, progress: 'subiendo fuente canónica' });
    if (job.prompt.length > pack.model.maximumPromptChars) throw new Error(`${job.id} supera el límite de prompt.`);
    const hostedSource = await ensureHostedSource(apiKey, job.source);
    const payload = buildGenerationPayload(job, hostedSource);
    const quote = await quoteReferenceJob(apiKey, pack.model.endpoint, payload);
    if (!finite(quote.cost)) throw new Error(`${job.id} no recibió una cotización válida.`);
    if (quote.cost > pack.model.maximumUnitCostUsd + 1e-9) {
      throw new Error(`${job.id}: ${usd(quote.cost)} supera el máximo unitario ${usd(pack.model.maximumUnitCostUsd)}.`);
    }
    updateJob(job.id, { status: 'quoted', quote: quote.cost, error: null, progress: null });
    audit('job-quoted', { jobId: job.id, quoteUsd: quote.cost });
    return { job, payload, quote };
  }, [audit, updateJob]);

  const needsGeneration = (job) => {
    const item = stateRef.current.jobs[job.id];
    if (item?.approved) return false;
    if (item?.outputUrl && !item?.rejected) return false;
    return true;
  };

  const preflight = useCallback(async (requestedJobs) => {
    const apiKey = requireKey();
    const liveBalance = await getLiveBalance(apiKey);
    const jobs = requestedJobs.filter(needsGeneration);
    const prepared = [];
    let quotedTotal = 0;
    for (const job of jobs) {
      const item = await prepareJob(job, apiKey);
      quotedTotal += Number(item.quote.cost);
      prepared.push(item);
    }
    const spent = Number(stateRef.current.spent || 0);
    if (spent + quotedTotal > pack.budget.stageCapUsd + 1e-9) {
      throw new Error(`El gasto acumulado llegaría a ${usd(spent + quotedTotal)}, por encima del tope ${usd(pack.budget.stageCapUsd)}.`);
    }
    if (liveBalance - quotedTotal < pack.budget.protectedReserveUsd - 1e-9) {
      throw new Error(`El lote dejaría ${usd(liveBalance - quotedTotal)}, por debajo de la reserva ${usd(pack.budget.protectedReserveUsd)}.`);
    }
    commit((current) => ({
      ...current,
      startingBalance: finite(current.startingBalance) ? current.startingBalance : liveBalance,
      currentBalance: liveBalance,
      message: prepared.length
        ? `${prepared.length} referencia(s) cotizadas por un máximo de ${usd(quotedTotal)}.`
        : 'No hay referencias pendientes de generación en esta fase.',
    }));
    return { apiKey, prepared };
  }, [commit, prepareJob]);

  const recordChargedOutput = useCallback((job, result, quoteCost, requestId) => {
    const outputUrl = result.url;
    if (!outputUrl) throw new Error(`${job.id} terminó sin URL de salida.`);
    const chargeId = requestId || `direct:${outputUrl}`;
    const actualCost = finite(result.cost) ? Number(result.cost) : Number(quoteCost);
    const alreadyRecorded = stateRef.current.chargedRequestIds.includes(chargeId);
    commit((current) => ({
      ...current,
      activeJobId: null,
      currentBalance: finite(result.balanceAfter) ? Number(result.balanceAfter) : current.currentBalance,
      spent: alreadyRecorded ? current.spent : Number(current.spent || 0) + actualCost,
      chargedRequestIds: alreadyRecorded ? current.chargedRequestIds : [...current.chargedRequestIds, chargeId],
      jobs: {
        ...current.jobs,
        [job.id]: {
          ...current.jobs[job.id],
          status: 'preserving',
          requestId: null,
          outputUrl,
          chargedRequestId: chargeId,
          cost: actualCost,
          approved: false,
          rejected: false,
          blobStored: false,
          error: null,
          progress: 'guardando copia local',
          generatedAt: new Date().toISOString(),
        },
      },
      audit: alreadyRecorded ? current.audit : [...current.audit, {
        event: 'charged-output-received',
        at: new Date().toISOString(),
        jobId: job.id,
        requestId: chargeId,
        costUsd: actualCost,
        balanceAfter: finite(result.balanceAfter) ? Number(result.balanceAfter) : null,
      }].slice(-600),
    }));
    return outputUrl;
  }, [commit]);

  const preserveOutput = useCallback(async (jobId, outputUrl) => {
    const job = pack.jobs.find((entry) => entry.id === jobId);
    if (!job || !outputUrl) return;
    try {
      updateJob(jobId, { status: 'preserving', progress: 'descargando copia local', error: null });
      const blob = await fetchGeneratedImageBlob(outputUrl);
      await putGeneratedBlob(jobId, blob);
      setPreview(jobId, blob);
      updateJob(jobId, { status: 'completed', blobStored: true, progress: null, error: null });
      audit('output-preserved', { jobId, bytes: blob.size, type: blob.type });
    } catch (error) {
      updateJob(jobId, {
        status: 'preservation-failed',
        blobStored: false,
        progress: null,
        error: error instanceof Error ? error.message : 'No se pudo guardar la imagen localmente.',
      });
      throw error;
    }
  }, [audit, setPreview, updateJob]);

  const executePrepared = useCallback(async ({ job, payload, quote }, apiKey) => {
    const current = stateRef.current;
    if (current.activeJobId && current.activeJobId !== job.id) throw new Error(`Ya existe una solicitud activa: ${current.activeJobId}.`);
    const liveBalance = await getLiveBalance(apiKey);
    if (Number(current.spent || 0) + Number(quote.cost) > pack.budget.stageCapUsd + 1e-9) throw new Error(`${job.id} superaría el tope total.`);
    if (liveBalance - Number(quote.cost) < pack.budget.protectedReserveUsd - 1e-9) throw new Error(`${job.id} vulneraría la reserva protegida.`);

    commit((value) => ({
      ...value,
      phase: 'generating',
      activeJobId: job.id,
      currentBalance: liveBalance,
      message: `Generando ${job.id}. No cierres la pestaña.`,
      jobs: {
        ...value.jobs,
        [job.id]: { ...value.jobs[job.id], status: 'generating', progress: 'enviando solicitud', error: null },
      },
    }));

    const submission = await submitReferenceJob(apiKey, pack.model.endpoint, payload);
    if (submission.requestId) {
      updateJob(job.id, { status: 'generating', requestId: submission.requestId, progress: 'procesando' });
      audit('request-submitted', { jobId: job.id, requestId: submission.requestId, quoteUsd: quote.cost });
    }

    if (submission.directUrl) {
      const outputUrl = recordChargedOutput(job, {
        url: submission.directUrl,
        cost: submission.submitCost,
        balanceAfter: submission.balanceAfter,
      }, quote.cost, submission.requestId);
      await preserveOutput(job.id, outputUrl);
      return;
    }
    if (!submission.requestId) throw new Error(`${job.id} no devolvió request_id ni imagen.`);

    const result = await pollReferenceJob(apiKey, submission.requestId, {
      onProgress: ({ attempt, attempts, status }) => updateJob(job.id, {
        status: 'generating',
        progress: `${status || 'procesando'} · ${attempt}/${attempts}`,
      }),
    });
    const outputUrl = recordChargedOutput(job, result, quote.cost, submission.requestId);
    await preserveOutput(job.id, outputUrl);
  }, [audit, commit, preserveOutput, recordChargedOutput, updateJob]);

  const runSequence = useCallback(async (requestedJobs, label) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      commit((current) => ({ ...current, phase: 'preflight', message: `Preparando ${label}…` }));
      const { apiKey, prepared } = await preflight(requestedJobs);
      for (const item of prepared) await executePrepared(item, apiKey);
      commit((current) => ({
        ...current,
        phase: 'review',
        activeJobId: null,
        message: prepared.length
          ? `${label} terminada. Revisa cada imagen antes de aprobarla.`
          : 'No se realizó ninguna compra porque las imágenes ya estaban generadas.',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La secuencia se detuvo.';
      const activeId = stateRef.current.activeJobId;
      const activeHasRequest = activeId && stateRef.current.jobs[activeId]?.requestId;
      commit((current) => ({
        ...current,
        phase: 'stopped',
        activeJobId: activeHasRequest ? activeId : null,
        message,
        jobs: activeId && !activeHasRequest ? {
          ...current.jobs,
          [activeId]: { ...current.jobs[activeId], status: 'failed', progress: null, error: message },
        } : current.jobs,
        audit: [...current.audit, { event: 'sequence-stopped', at: new Date().toISOString(), error: message, activeJobId: activeId || null }].slice(-600),
      }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, executePrepared, preflight]);

  const resumeRequest = useCallback(async () => {
    if (runningRef.current) return;
    const job = pack.jobs.find((entry) => stateRef.current.jobs[entry.id]?.requestId)
      || pack.jobs.find((entry) => entry.id === stateRef.current.activeJobId);
    const requestId = job && stateRef.current.jobs[job.id]?.requestId;
    if (!job || !requestId) return;
    runningRef.current = true;
    try {
      const apiKey = requireKey();
      commit((current) => ({ ...current, phase: 'generating', activeJobId: job.id, message: `Reanudando ${job.id}; no se enviará otra compra.` }));
      const result = await pollReferenceJob(apiKey, requestId, {
        onProgress: ({ attempt, attempts, status }) => updateJob(job.id, {
          status: 'generating',
          progress: `${status || 'procesando'} · ${attempt}/${attempts}`,
        }),
      });
      const outputUrl = recordChargedOutput(job, result, stateRef.current.jobs[job.id]?.quote, requestId);
      await preserveOutput(job.id, outputUrl);
      commit((current) => ({ ...current, phase: 'review', activeJobId: null, message: `${job.id} recuperada correctamente.` }));
    } catch (error) {
      commit((current) => ({ ...current, phase: 'stopped', message: error instanceof Error ? error.message : 'No se pudo reanudar la solicitud.' }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, preserveOutput, recordChargedOutput, updateJob]);

  const approve = useCallback((jobId) => {
    const item = stateRef.current.jobs[jobId];
    if (!item?.blobStored) return;
    updateJob(jobId, { status: 'approved', approved: true, rejected: false, error: null });
    audit('job-approved', { jobId });
  }, [audit, updateJob]);

  const reject = useCallback((jobId) => {
    updateJob(jobId, { status: 'rejected', approved: false, rejected: true });
    audit('job-rejected', { jobId });
  }, [audit, updateJob]);

  const regenerate = useCallback(async () => {
    if (!confirmRegeneration || !rejectedJobs.length) return;
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        ...Object.fromEntries(rejectedJobs.map((job) => [job.id, {
          ...current.jobs[job.id],
          status: 'pending',
          quote: null,
          requestId: null,
          outputUrl: null,
          chargedRequestId: null,
          cost: null,
          approved: false,
          rejected: false,
          blobStored: false,
          error: null,
          progress: null,
        }])),
      },
      message: `${rejectedJobs.length} regeneración(es) autorizada(s); se cotizarán de nuevo.`,
    }));
    setConfirmRegeneration(false);
    await runSequence(rejectedJobs, 'regeneración autorizada');
  }, [commit, confirmRegeneration, rejectedJobs, runSequence]);

  const exportPack = useCallback(async () => {
    if (!allApproved) return;
    const blobs = {};
    for (const job of pack.jobs) {
      const blob = await getGeneratedBlob(job.id);
      if (!(blob instanceof Blob)) throw new Error(`Falta la copia local de ${job.id}.`);
      blobs[job.id] = blob;
    }
    const contact = await makeContactSheet(pack.jobs, blobs);
    const summary = {
      ...pack,
      exportedAt: new Date().toISOString(),
      generationSummary: {
        startingBalanceUsd: stateRef.current.startingBalance,
        finalBalanceUsd: stateRef.current.currentBalance,
        spentUsd: stateRef.current.spent,
        files: pack.jobs.map((job) => ({
          id: job.id,
          category: job.category,
          filename: safeFileName(job.id, blobs[job.id]),
          costUsd: stateRef.current.jobs[job.id]?.cost,
          generatedAt: stateRef.current.jobs[job.id]?.generatedAt,
          approved: true,
        })),
      },
    };
    const costs = {
      packId: pack.id,
      exportedAt: new Date().toISOString(),
      spentUsd: stateRef.current.spent,
      jobs: Object.fromEntries(pack.jobs.map((job) => [job.id, {
        source: job.source,
        prompt: job.prompt,
        imageSize: job.imageSize,
        quoteUsd: stateRef.current.jobs[job.id]?.quote,
        costUsd: stateRef.current.jobs[job.id]?.cost,
        chargedRequestId: stateRef.current.jobs[job.id]?.chargedRequestId,
      }])),
      events: stateRef.current.audit,
    };

    if (typeof window.showDirectoryPicker === 'function') {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      const folder = await root.getDirectoryHandle(pack.outputPackageName, { create: true });
      const write = async (directory, name, blob) => {
        const handle = await directory.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      };
      for (const categoryName of new Set(pack.jobs.map((job) => job.category))) {
        await folder.getDirectoryHandle(categoryName, { create: true });
      }
      for (const job of pack.jobs) {
        const directory = await folder.getDirectoryHandle(job.category, { create: true });
        await write(directory, safeFileName(job.id, blobs[job.id]), blobs[job.id]);
      }
      await write(folder, '00_REVISION_GENERAL.png', contact);
      await write(folder, 'manifest.json', new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }));
      await write(folder, 'PROMPTS_AND_COSTS.json', new Blob([JSON.stringify(costs, null, 2)], { type: 'application/json' }));
      commit((current) => ({ ...current, message: `Paquete guardado en ${pack.outputPackageName}.` }));
      return;
    }

    await downloadBlob(contact, '00_REVISION_GENERAL.png');
    await textDownload(JSON.stringify(summary, null, 2), 'manifest.json');
    await textDownload(JSON.stringify(costs, null, 2), 'PROMPTS_AND_COSTS.json');
    for (const job of pack.jobs) {
      await downloadBlob(blobs[job.id], safeFileName(job.id, blobs[job.id]));
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    commit((current) => ({ ...current, message: 'Descarga individual iniciada. El navegador puede solicitar permiso para varios archivos.' }));
  }, [allApproved, commit]);

  const reset = useCallback(async () => {
    if (runningRef.current) return;
    for (const job of pack.jobs) await deleteGeneratedBlob(job.id).catch(() => {});
    Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = {};
    setPreviews({});
    clearPersistedState();
    const next = freshState();
    stateRef.current = next;
    setState(next);
  }, []);

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.13),transparent_35%),radial-gradient(circle_at_95%_5%,rgba(168,85,247,.12),transparent_32%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45 transition hover:text-white">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200/70">MuAPI Canon Pack Guard · v2</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Referencias canónicas para OpenArt</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">{pack.jobs.length} referencias desde el canon v4. Primero genera únicamente Nara y Pompón; el lote restante no se desbloquea hasta aprobar ambas. Una solicitud pagada como máximo, cotización viva, sin reintentos automáticos y sin subir nada a OpenArt.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value={`${approvedCount}/${pack.jobs.length}`} label="aprobadas" accent="text-emerald-200" />
              <Metric value={`${generatedCount}/${pack.jobs.length}`} label="con salida" />
              <Metric value={usd(state.spent)} label="gastado" accent="text-amber-200" />
              <Metric value={usd(state.currentBalance)} label="saldo vivo" accent="text-cyan-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-5">
              <h2 className="font-black">Protección económica</h2>
              <div className="mt-4 space-y-2 text-xs leading-5 text-white/45">
                <div className="flex justify-between gap-3"><span>Modelo</span><strong className="text-white/75">{pack.model.displayName}</strong></div>
                <div className="flex justify-between gap-3"><span>Tope total</span><strong className="text-amber-100">{usd(pack.budget.stageCapUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Máximo por imagen</span><strong>{usd(pack.model.maximumUnitCostUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Reserva mínima</span><strong className="text-emerald-100">{usd(pack.budget.protectedReserveUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Reintentos automáticos</span><strong>0</strong></div>
                <div className="flex justify-between gap-3"><span>Créditos OpenArt</span><strong>bloqueados</strong></div>
              </div>
              <button type="button" disabled={busy} onClick={checkBalance} className="mt-4 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-xs font-black text-cyan-100 transition enabled:hover:bg-cyan-300/[.1] disabled:opacity-35">Comprobar saldo vivo</button>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-100/60">Fase 1 obligatoria</p>
              <h2 className="mt-2 font-black text-amber-50">Calibrar Nara y Pompón</h2>
              <p className="mt-2 text-xs leading-5 text-amber-50/45">Dos imágenes de alto riesgo. Coste esperado aproximado: {usd(pack.calibration.jobIds.length * pack.model.expectedUnitCostUsd)}.</p>
              <button type="button" disabled={busy || calibrationApproved} onClick={() => runSequence(calibrationJobs, 'calibración de Nara y Pompón')} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-amber-950 transition enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">{calibrationApproved ? 'Calibración aprobada ✓' : 'Generar calibración protegida'}</button>
            </section>

            <section className={`rounded-3xl border p-5 ${calibrationApproved ? 'border-emerald-300/15 bg-emerald-300/[.035]' : 'border-white/[.08] bg-[#0c0e13]'}`}>
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">Fase 2</p>
              <h2 className="mt-2 font-black">Lote restante</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">{remainingJobs.length} referencias. Se desbloquea solo después de aprobar visualmente las dos calibraciones.</p>
              <button type="button" disabled={busy || !calibrationApproved || remainingJobs.every((job) => state.jobs[job.id]?.approved)} onClick={() => runSequence(remainingJobs, 'lote canónico restante')} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950 transition enabled:hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-30">Generar lote restante</button>
            </section>

            {activeRequestExists && (
              <section className="rounded-3xl border border-violet-300/20 bg-violet-300/[.05] p-5">
                <h2 className="font-black text-violet-100">Solicitud pendiente detectada</h2>
                <p className="mt-2 text-xs leading-5 text-violet-50/45">Este botón solo consulta el request_id guardado. No envía una segunda compra.</p>
                <button type="button" disabled={runningRef.current} onClick={resumeRequest} className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-xs font-black text-violet-950">Reanudar seguimiento seguro</button>
              </section>
            )}

            {rejectedJobs.length > 0 && (
              <section className="rounded-3xl border border-red-300/15 bg-red-300/[.035] p-5">
                <h2 className="font-black text-red-100">{rejectedJobs.length} referencia(s) rechazada(s)</h2>
                <label className="mt-3 flex items-start gap-3 text-xs leading-5 text-red-50/55">
                  <input type="checkbox" checked={confirmRegeneration} onChange={(event) => setConfirmRegeneration(event.target.checked)} className="mt-1" />
                  <span>Autorizo una nueva compra solo para las rechazadas, con cotización y topes nuevos.</span>
                </label>
                <button type="button" disabled={busy || !confirmRegeneration} onClick={regenerate} className="mt-4 w-full rounded-xl border border-red-200/25 px-4 py-3 text-xs font-black text-red-100 disabled:opacity-30">Regenerar rechazadas</button>
              </section>
            )}

            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-5">
              <h2 className="font-black">Entrega local</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">Guarda imágenes, hoja de revisión, manifiesto y costes. No sube archivos a OpenArt.</p>
              <button type="button" disabled={!allApproved || busy} onClick={() => exportPack().catch((error) => commit((current) => ({ ...current, message: error.message })))} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">Exportar paquete aprobado</button>
              <button type="button" disabled={busy} onClick={reset} className="mt-2 w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/35 transition hover:bg-white/[.04]">Borrar progreso local</button>
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className={`rounded-2xl border px-5 py-4 text-sm ${state.phase === 'stopped' ? 'border-red-300/20 bg-red-300/[.05] text-red-100' : 'border-cyan-300/15 bg-cyan-300/[.035] text-cyan-50/65'}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{hydrated ? state.message : 'Recuperando progreso e imágenes locales…'}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{state.phase}</span>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${category === item ? 'bg-white text-black' : 'border border-white/10 text-white/40 hover:text-white'}`}>{item === 'all' ? 'todas' : item}</button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleJobs.map((job) => {
                const result = state.jobs[job.id] || JOB_DEFAULTS;
                const status = result.approved ? 'approved' : result.rejected ? 'rejected' : result.status;
                const canReview = result.blobStored && ['completed', 'approved', 'rejected'].includes(status);
                return (
                  <article key={job.id} className={`overflow-hidden rounded-3xl border bg-[#0c0e13] ${job.calibration ? 'border-amber-300/20' : 'border-white/[.08]'}`}>
                    <div className="relative aspect-[4/3] bg-black/35">
                      <img src={previews[job.id] || job.source} alt={previews[job.id] ? `Resultado ${job.id}` : `Fuente ${job.id}`} className={`h-full w-full object-contain ${previews[job.id] ? '' : 'opacity-55'}`} />
                      <div className="absolute left-3 top-3"><StatusPill status={status} /></div>
                      {job.calibration && <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-950">calibración</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white/85">{job.id}</p>
                          <p className="mt-1 text-[11px] text-white/35">{job.category} · {job.view}</p>
                        </div>
                        <div className="text-right text-[10px] text-white/35"><div>cotizada {usd(result.quote)}</div><div>real {usd(result.cost)}</div></div>
                      </div>
                      {result.progress && <p className="mt-3 text-xs text-amber-100/60">{result.progress}</p>}
                      {result.error && <p className="mt-3 rounded-xl bg-red-300/[.06] p-3 text-xs leading-5 text-red-100/70">{result.error}</p>}
                      {status === 'preservation-failed' && result.outputUrl && (
                        <button type="button" onClick={() => preserveOutput(job.id, result.outputUrl).catch(() => {})} className="mt-4 w-full rounded-xl border border-orange-300/20 px-3 py-2.5 text-xs font-black text-orange-100">Volver a guardar sin generar</button>
                      )}
                      {canReview && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => approve(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${result.approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-300/20 text-emerald-100'}`}>Aprobar</button>
                          <button type="button" onClick={() => reject(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${result.rejected ? 'bg-red-300 text-red-950' : 'border border-red-300/20 text-red-100'}`}>Rechazar</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
