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

const INITIAL_JOB = {
  status: 'pending',
  quote: null,
  requestId: null,
  remoteUrl: null,
  cost: null,
  approved: false,
  rejected: false,
  error: null,
  progress: null,
  generatedAt: null,
};

function initialState() {
  return {
    version: 1,
    phase: 'idle',
    startingBalance: null,
    currentBalance: null,
    spent: 0,
    activeJobId: null,
    message: 'Conecta con el saldo vivo antes de preparar el lote.',
    jobs: Object.fromEntries(pack.jobs.map((job) => [job.id, { ...INITIAL_JOB }])),
    audit: [],
  };
}

function mergePersisted(value) {
  const base = initialState();
  if (!value || value.version !== base.version) return base;
  return {
    ...base,
    ...value,
    activeJobId: value.activeJobId || null,
    jobs: Object.fromEntries(pack.jobs.map((job) => [
      job.id,
      { ...INITIAL_JOB, ...(value.jobs?.[job.id] || {}) },
    ])),
    audit: Array.isArray(value.audit) ? value.audit : [],
  };
}

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(4)}` : '—';
}

function StatusPill({ status }) {
  const styles = {
    pending: 'border-white/10 bg-white/[.03] text-white/40',
    preparing: 'border-cyan-300/20 bg-cyan-300/[.06] text-cyan-100',
    quoted: 'border-sky-300/20 bg-sky-300/[.06] text-sky-100',
    generating: 'border-amber-300/20 bg-amber-300/[.07] text-amber-100',
    completed: 'border-violet-300/20 bg-violet-300/[.07] text-violet-100',
    approved: 'border-emerald-300/20 bg-emerald-300/[.08] text-emerald-100',
    rejected: 'border-red-300/20 bg-red-300/[.07] text-red-100',
    failed: 'border-red-300/20 bg-red-300/[.07] text-red-100',
  };
  const labels = {
    pending: 'pendiente',
    preparing: 'preparando',
    quoted: 'cotizada',
    generating: 'generando',
    completed: 'por revisar',
    approved: 'aprobada',
    rejected: 'rechazada',
    failed: 'falló',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

function Metric({ label, value, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-black/20 px-4 py-3 text-center">
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}

function downloadText(text, filename, type = 'application/json') {
  return downloadBlob(new Blob([text], { type }), filename);
}

async function createContactSheet(approvedJobs, blobs) {
  const columns = 5;
  const cellWidth = 420;
  const imageHeight = 280;
  const labelHeight = 54;
  const cellHeight = imageHeight + labelHeight;
  const rows = Math.ceil(approvedJobs.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellWidth;
  canvas.height = Math.max(1, rows) * cellHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la hoja de revisión.');

  context.fillStyle = '#0b0d12';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 18px Arial';
  context.textBaseline = 'middle';

  for (let index = 0; index < approvedJobs.length; index += 1) {
    const job = approvedJobs[index];
    const blob = blobs[job.id];
    if (!blob) continue;
    const bitmap = await createImageBitmap(blob);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * cellWidth;
    const y = row * cellHeight;
    const scale = Math.min(cellWidth / bitmap.width, imageHeight / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.fillStyle = '#050609';
    context.fillRect(x, y, cellWidth, imageHeight);
    context.drawImage(bitmap, x + (cellWidth - width) / 2, y + (imageHeight - height) / 2, width, height);
    bitmap.close();
    context.fillStyle = '#11151d';
    context.fillRect(x, y + imageHeight, cellWidth, labelHeight);
    context.fillStyle = '#e7f8ff';
    context.fillText(job.id, x + 14, y + imageHeight + labelHeight / 2);
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo exportar la hoja de revisión.')), 'image/png');
  });
}

export default function LumoReferenceGeneratorPageClient() {
  const router = useRouter();
  const stateRef = useRef(initialState());
  const objectUrlsRef = useRef({});
  const runningRef = useRef(false);
  const [state, setState] = useState(initialState);
  const [previewUrls, setPreviewUrls] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [regenerationConfirmed, setRegenerationConfirmed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const commit = useCallback((updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      stateRef.current = next;
      try { persistState(next); } catch { /* local persistence is optional */ }
      return next;
    });
  }, []);

  const setPreview = useCallback((jobId, blob) => {
    const previous = objectUrlsRef.current[jobId];
    if (previous) URL.revokeObjectURL(previous);
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current[jobId] = url;
    setPreviewUrls((current) => ({ ...current, [jobId]: url }));
  }, []);

  useEffect(() => {
    const restored = mergePersisted(readPersistedState());
    stateRef.current = restored;
    setState(restored);
    let active = true;
    Promise.all(pack.jobs.map(async (job) => {
      const blob = await getGeneratedBlob(job.id).catch(() => null);
      if (active && blob instanceof Blob) setPreview(job.id, blob);
    })).finally(() => active && setHydrated(true));

    return () => {
      active = false;
      for (const url of Object.values(objectUrlsRef.current)) URL.revokeObjectURL(url);
    };
  }, [setPreview]);

  const categories = useMemo(() => ['all', ...new Set(pack.jobs.map((job) => job.category))], []);
  const filteredJobs = useMemo(
    () => selectedCategory === 'all' ? pack.jobs : pack.jobs.filter((job) => job.category === selectedCategory),
    [selectedCategory],
  );

  const calibrationJobs = useMemo(
    () => pack.calibration.jobIds.map((id) => pack.jobs.find((job) => job.id === id)).filter(Boolean),
    [],
  );
  const remainingJobs = useMemo(
    () => pack.jobs.filter((job) => !pack.calibration.jobIds.includes(job.id)),
    [],
  );

  const approvedCount = pack.jobs.filter((job) => state.jobs[job.id]?.approved).length;
  const completedCount = pack.jobs.filter((job) => ['completed', 'approved', 'rejected'].includes(state.jobs[job.id]?.status)).length;
  const calibrationApproved = calibrationJobs.every((job) => state.jobs[job.id]?.approved);
  const allApproved = approvedCount === pack.jobs.length;
  const anyRejected = pack.jobs.some((job) => state.jobs[job.id]?.rejected);
  const projectedBalance = Number.isFinite(state.startingBalance)
    ? state.startingBalance - state.spent
    : null;

  const addAudit = useCallback((event, data = {}) => {
    commit((current) => ({
      ...current,
      audit: [...current.audit, { event, at: new Date().toISOString(), ...data }].slice(-500),
    }));
  }, [commit]);

  const updateJob = useCallback((jobId, patch) => {
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: { ...current.jobs[jobId], ...patch },
      },
    }));
  }, [commit]);

  const requireApiKey = () => {
    const apiKey = getStoredMuapiKey();
    if (!apiKey) throw new Error('No se encontró la clave MuAPI guardada. Configúrala en Settings; no la pegues en esta pantalla.');
    return apiKey;
  };

  const refreshBalance = useCallback(async () => {
    const apiKey = requireApiKey();
    const balance = await getLiveBalance(apiKey);
    commit((current) => ({
      ...current,
      startingBalance: Number.isFinite(current.startingBalance) ? current.startingBalance : balance,
      currentBalance: balance,
      message: `Saldo vivo verificado: ${money(balance)}.`,
    }));
    return balance;
  }, [commit]);

  const prepareJob = useCallback(async (job, apiKey) => {
    updateJob(job.id, { status: 'preparing', error: null });
    const hostedSource = await ensureHostedSource(apiKey, job.source);
    const payload = buildGenerationPayload(job, hostedSource);
    if (job.prompt.length > pack.model.maximumPromptChars) {
      throw new Error(`${job.id} supera el límite de ${pack.model.maximumPromptChars} caracteres.`);
    }
    const quote = await quoteReferenceJob(apiKey, pack.model.endpoint, payload);
    if (quote.cost > pack.model.maximumUnitCostUsd) {
      throw new Error(`${job.id}: la cotización ${money(quote.cost)} supera el máximo unitario ${money(pack.model.maximumUnitCostUsd)}.`);
    }
    updateJob(job.id, { status: 'quoted', quote: quote.cost, error: null });
    addAudit('job-quoted', { jobId: job.id, quoteUsd: quote.cost });
    return { hostedSource, payload, quote };
  }, [addAudit, updateJob]);

  const preflightJobs = useCallback(async (jobs) => {
    const apiKey = requireApiKey();
    const balance = await getLiveBalance(apiKey);
    const prepared = [];
    let total = 0;
    for (const job of jobs) {
      const current = stateRef.current.jobs[job.id];
      if (current?.approved) continue;
      const item = await prepareJob(job, apiKey);
      total += item.quote.cost;
      prepared.push({ job, ...item });
    }
    const spent = Number(stateRef.current.spent || 0);
    if (spent + total > pack.budget.stageCapUsd + 1e-9) {
      throw new Error(`El lote cotizado elevaría el gasto a ${money(spent + total)}, por encima del tope ${money(pack.budget.stageCapUsd)}.`);
    }
    if (balance - total < pack.budget.protectedReserveUsd - 1e-9) {
      throw new Error(`El lote dejaría ${money(balance - total)}, por debajo de la reserva protegida ${money(pack.budget.protectedReserveUsd)}.`);
    }
    commit((current) => ({
      ...current,
      startingBalance: Number.isFinite(current.startingBalance) ? current.startingBalance : balance,
      currentBalance: balance,
      message: `${prepared.length} referencia(s) cotizadas por un máximo de ${money(total)}.`,
    }));
    return { apiKey, balance, total, prepared };
  }, [commit, prepareJob]);

  const finalizeJob = useCallback(async (job, result, quoteCost) => {
    const blob = await fetchGeneratedImageBlob(result.url);
    await putGeneratedBlob(job.id, blob);
    setPreview(job.id, blob);
    const cost = Number.isFinite(Number(result.cost)) ? Number(result.cost) : Number(quoteCost);
    commit((current) => {
      const previous = current.jobs[job.id];
      const alreadyCharged = Number.isFinite(Number(previous.cost));
      return {
        ...current,
        activeJobId: null,
        currentBalance: Number.isFinite(Number(result.balanceAfter)) ? Number(result.balanceAfter) : current.currentBalance,
        spent: alreadyCharged ? current.spent : current.spent + cost,
        jobs: {
          ...current.jobs,
          [job.id]: {
            ...previous,
            status: 'completed',
            requestId: null,
            remoteUrl: result.url,
            cost,
            approved: false,
            rejected: false,
            error: null,
            progress: null,
            generatedAt: new Date().toISOString(),
          },
        },
        audit: [...current.audit, {
          event: 'job-completed',
          at: new Date().toISOString(),
          jobId: job.id,
          costUsd: cost,
          balanceAfter: result.balanceAfter ?? null,
        }].slice(-500),
      };
    });
  }, [commit, setPreview]);

  const executePreparedJob = useCallback(async (preparedItem, apiKey) => {
    const { job, payload, quote } = preparedItem;
    const liveState = stateRef.current;
    if (liveState.activeJobId && liveState.activeJobId !== job.id) {
      throw new Error(`Ya existe una solicitud protegida activa: ${liveState.activeJobId}.`);
    }
    const freshBalance = await getLiveBalance(apiKey);
    if (Number(liveState.spent || 0) + quote.cost > pack.budget.stageCapUsd + 1e-9) {
      throw new Error(`${job.id} superaría el tope total del lote.`);
    }
    if (freshBalance - quote.cost < pack.budget.protectedReserveUsd - 1e-9) {
      throw new Error(`${job.id} vulneraría la reserva protegida.`);
    }

    commit((current) => ({
      ...current,
      phase: 'generating',
      activeJobId: job.id,
      currentBalance: freshBalance,
      message: `Generando ${job.id}. No cierres la pestaña.`,
      jobs: {
        ...current.jobs,
        [job.id]: { ...current.jobs[job.id], status: 'generating', error: null, progress: 'enviando' },
      },
    }));

    const submission = await submitReferenceJob(apiKey, pack.model.endpoint, payload);
    if (submission.requestId) {
      commit((current) => ({
        ...current,
        jobs: {
          ...current.jobs,
          [job.id]: {
            ...current.jobs[job.id],
            requestId: submission.requestId,
            progress: 'procesando',
          },
        },
        audit: [...current.audit, {
          event: 'request-submitted',
          at: new Date().toISOString(),
          jobId: job.id,
          requestId: submission.requestId,
          quoteUsd: quote.cost,
        }].slice(-500),
      }));
    }

    if (submission.directUrl) {
      await finalizeJob(job, {
        url: submission.directUrl,
        cost: submission.submitCost,
        balanceAfter: submission.balanceAfter,
      }, quote.cost);
      return;
    }
    if (!submission.requestId) throw new Error(`${job.id} no devolvió request_id ni imagen.`);

    const result = await pollReferenceJob(apiKey, submission.requestId, {
      onProgress: ({ attempt, attempts, status }) => updateJob(job.id, {
        status: 'generating',
        progress: `${status || 'procesando'} · ${attempt}/${attempts}`,
      }),
    });
    await finalizeJob(job, result, quote.cost);
  }, [commit, finalizeJob, updateJob]);

  const runProtectedSequence = useCallback(async (jobs, label) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      commit((current) => ({ ...current, phase: 'preflight', message: `Preparando ${label}…` }));
      const preflight = await preflightJobs(jobs);
      for (const item of preflight.prepared) {
        await executePreparedJob(item, preflight.apiKey);
      }
      commit((current) => ({
        ...current,
        phase: 'review',
        activeJobId: null,
        message: `${label} terminado. Revisa y aprueba cada imagen antes de continuar.`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La generación protegida se detuvo.';
      const activeJobId = stateRef.current.activeJobId;
      commit((current) => ({
        ...current,
        phase: 'stopped',
        activeJobId: null,
        message,
        jobs: activeJobId ? {
          ...current.jobs,
          [activeJobId]: { ...current.jobs[activeJobId], status: 'failed', error: message },
        } : current.jobs,
        audit: [...current.audit, { event: 'sequence-stopped', at: new Date().toISOString(), error: message }].slice(-500),
      }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, executePreparedJob, preflightJobs]);

  const resumeActiveRequest = useCallback(async () => {
    const active = stateRef.current.activeJobId
      || pack.jobs.find((job) => stateRef.current.jobs[job.id]?.requestId)?.id;
    if (!active || runningRef.current) return;
    const requestId = stateRef.current.jobs[active]?.requestId;
    const job = pack.jobs.find((item) => item.id === active);
    if (!requestId || !job) return;
    runningRef.current = true;
    try {
      const apiKey = requireApiKey();
      commit((current) => ({ ...current, activeJobId: active, phase: 'generating', message: `Reanudando seguimiento de ${active}; no se enviará otra compra.` }));
      const result = await pollReferenceJob(apiKey, requestId, {
        onProgress: ({ attempt, attempts, status }) => updateJob(active, {
          status: 'generating',
          progress: `${status || 'procesando'} · ${attempt}/${attempts}`,
        }),
      });
      await finalizeJob(job, result, stateRef.current.jobs[active]?.quote);
      commit((current) => ({ ...current, phase: 'review', message: `${active} recuperada correctamente.` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo recuperar la solicitud.';
      commit((current) => ({ ...current, phase: 'stopped', message }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, finalizeJob, updateJob]);

  const approveJob = useCallback((jobId) => {
    updateJob(jobId, { status: 'approved', approved: true, rejected: false, error: null });
    addAudit('job-approved', { jobId });
  }, [addAudit, updateJob]);

  const rejectJob = useCallback((jobId) => {
    updateJob(jobId, { status: 'rejected', approved: false, rejected: true });
    addAudit('job-rejected', { jobId });
  }, [addAudit, updateJob]);

  const regenerateRejected = useCallback(async () => {
    if (!regenerationConfirmed) return;
    const jobs = pack.jobs.filter((job) => stateRef.current.jobs[job.id]?.rejected);
    for (const job of jobs) {
      await deleteGeneratedBlob(job.id).catch(() => {});
      const url = objectUrlsRef.current[job.id];
      if (url) URL.revokeObjectURL(url);
      delete objectUrlsRef.current[job.id];
      setPreviewUrls((current) => {
        const next = { ...current };
        delete next[job.id];
        return next;
      });
      updateJob(job.id, { ...INITIAL_JOB });
    }
    setRegenerationConfirmed(false);
    await runProtectedSequence(jobs, 'regeneración autorizada');
  }, [regenerationConfirmed, runProtectedSequence, updateJob]);

  const exportPackage = useCallback(async () => {
    if (!allApproved) return;
    const blobs = {};
    for (const job of pack.jobs) {
      const blob = await getGeneratedBlob(job.id);
      if (!(blob instanceof Blob)) throw new Error(`Falta el archivo local de ${job.id}.`);
      blobs[job.id] = blob;
    }
    const approvedJobs = pack.jobs.filter((job) => stateRef.current.jobs[job.id]?.approved);
    const contactSheet = await createContactSheet(approvedJobs, blobs);
    const manifest = {
      ...pack,
      exportedAt: new Date().toISOString(),
      generationSummary: {
        startingBalanceUsd: stateRef.current.startingBalance,
        finalBalanceUsd: stateRef.current.currentBalance,
        spentUsd: stateRef.current.spent,
        approvedJobs: approvedJobs.map((job) => ({
          id: job.id,
          category: job.category,
          filename: safeFileName(job.id, blobs[job.id]),
          costUsd: stateRef.current.jobs[job.id]?.cost,
          generatedAt: stateRef.current.jobs[job.id]?.generatedAt,
        })),
      },
    };
    const audit = {
      packId: pack.id,
      exportedAt: new Date().toISOString(),
      spentUsd: stateRef.current.spent,
      jobs: Object.fromEntries(pack.jobs.map((job) => [job.id, {
        prompt: job.prompt,
        source: job.source,
        imageSize: job.imageSize,
        quoteUsd: stateRef.current.jobs[job.id]?.quote,
        costUsd: stateRef.current.jobs[job.id]?.cost,
        requestId: stateRef.current.jobs[job.id]?.requestId || null,
        approved: stateRef.current.jobs[job.id]?.approved,
      }])),
      events: stateRef.current.audit,
    };

    if (typeof window.showDirectoryPicker === 'function') {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      const folder = await root.getDirectoryHandle(pack.outputPackageName, { create: true });
      for (const category of new Set(pack.jobs.map((job) => job.category))) {
        await folder.getDirectoryHandle(category, { create: true });
      }
      for (const job of approvedJobs) {
        const category = await folder.getDirectoryHandle(job.category, { create: true });
        const handle = await category.getFileHandle(safeFileName(job.id, blobs[job.id]), { create: true });
        const writable = await handle.createWritable();
        await writable.write(blobs[job.id]);
        await writable.close();
      }
      const files = [
        ['00_REVISION_GENERAL.png', contactSheet],
        ['manifest.json', new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })],
        ['PROMPTS_AND_COSTS.json', new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' })],
      ];
      for (const [name, blob] of files) {
        const handle = await folder.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
      commit((current) => ({ ...current, message: `Paquete guardado en la carpeta ${pack.outputPackageName}.` }));
      return;
    }

    await downloadBlob(contactSheet, '00_REVISION_GENERAL.png');
    await downloadText(JSON.stringify(manifest, null, 2), 'manifest.json');
    await downloadText(JSON.stringify(audit, null, 2), 'PROMPTS_AND_COSTS.json');
    for (const job of approvedJobs) {
      await downloadBlob(blobs[job.id], safeFileName(job.id, blobs[job.id]));
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    commit((current) => ({ ...current, message: 'Descarga individual iniciada. El navegador puede pedir permiso para varios archivos.' }));
  }, [allApproved, commit]);

  const resetAll = useCallback(async () => {
    if (runningRef.current) return;
    for (const job of pack.jobs) await deleteGeneratedBlob(job.id).catch(() => {});
    for (const url of Object.values(objectUrlsRef.current)) URL.revokeObjectURL(url);
    objectUrlsRef.current = {};
    setPreviewUrls({});
    clearPersistedState();
    const next = initialState();
    stateRef.current = next;
    setState(next);
  }, []);

  const activeRequestExists = Boolean(state.activeJobId || pack.jobs.some((job) => state.jobs[job.id]?.requestId));
  const isBusy = ['preflight', 'generating'].includes(state.phase) || activeRequestExists;

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.13),transparent_35%),radial-gradient(circle_at_95%_5%,rgba(168,85,247,.12),transparent_32%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45 transition hover:text-white">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200/70">MuAPI Canon Pack Guard · v1</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Referencias canónicas para OpenArt</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">Genera {pack.jobs.length} referencias desde el canon v4, una compra cada vez. Primero calibra Nara y Pompón; el lote completo permanece bloqueado hasta aprobar ambas. OpenArt no recibe ningún archivo automáticamente.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value={`${approvedCount}/${pack.jobs.length}`} label="aprobadas" accent="text-emerald-200" />
              <Metric value={`${completedCount}/${pack.jobs.length}`} label="generadas" />
              <Metric value={money(state.spent)} label="gastado" accent="text-amber-200" />
              <Metric value={money(state.currentBalance ?? projectedBalance)} label="saldo vivo" accent="text-cyan-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-5">
              <h2 className="font-black">Protección económica</h2>
              <div className="mt-4 space-y-2 text-xs leading-5 text-white/45">
                <div className="flex justify-between gap-3"><span>Modelo</span><strong className="text-white/75">{pack.model.displayName}</strong></div>
                <div className="flex justify-between gap-3"><span>Tope total</span><strong className="text-amber-100">{money(pack.budget.stageCapUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Máximo por imagen</span><strong>{money(pack.model.maximumUnitCostUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Reserva mínima</span><strong className="text-emerald-100">{money(pack.budget.protectedReserveUsd)}</strong></div>
                <div className="flex justify-between gap-3"><span>Solicitudes simultáneas</span><strong>1</strong></div>
                <div className="flex justify-between gap-3"><span>Reintentos automáticos</span><strong>0</strong></div>
              </div>
              <button type="button" disabled={isBusy} onClick={() => refreshBalance().catch((error) => commit((current) => ({ ...current, message: error.message })))} className="mt-4 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-xs font-black text-cyan-100 transition enabled:hover:bg-cyan-300/[.1] disabled:opacity-35">
                Comprobar saldo vivo
              </button>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-100/60">Fase 1 obligatoria</p>
              <h2 className="mt-2 font-black text-amber-50">Calibrar Nara y Pompón</h2>
              <p className="mt-2 text-xs leading-5 text-amber-50/45">Solo genera dos imágenes de alto riesgo. Coste esperado aproximado: {money(pack.calibration.jobIds.length * pack.model.expectedUnitCostUsd)}.</p>
              <button type="button" disabled={isBusy || calibrationApproved} onClick={() => runProtectedSequence(calibrationJobs, 'calibración de Nara y Pompón')} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-amber-950 transition enabled:hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35">
                {calibrationApproved ? 'Calibración aprobada ✓' : 'Generar calibración protegida'}
              </button>
            </section>

            <section className={`rounded-3xl border p-5 ${calibrationApproved ? 'border-emerald-300/15 bg-emerald-300/[.035]' : 'border-white/[.08] bg-[#0c0e13]'}`}>
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">Fase 2</p>
              <h2 className="mt-2 font-black">Lote restante</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">{remainingJobs.length} referencias. Solo se desbloquea cuando las dos calibraciones estén aprobadas visualmente.</p>
              <button type="button" disabled={isBusy || !calibrationApproved || remainingJobs.every((job) => state.jobs[job.id]?.approved)} onClick={() => runProtectedSequence(remainingJobs.filter((job) => !state.jobs[job.id]?.approved), 'lote canónico restante')} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950 transition enabled:hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-30">
                Generar lote restante
              </button>
            </section>

            {activeRequestExists && (
              <section className="rounded-3xl border border-violet-300/20 bg-violet-300/[.05] p-5">
                <h2 className="font-black text-violet-100">Solicitud pendiente detectada</h2>
                <p className="mt-2 text-xs leading-5 text-violet-50/45">Reanudar solo consulta el request_id guardado. No envía una segunda compra.</p>
                <button type="button" disabled={runningRef.current} onClick={resumeActiveRequest} className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-xs font-black text-violet-950">Reanudar seguimiento seguro</button>
              </section>
            )}

            {anyRejected && (
              <section className="rounded-3xl border border-red-300/15 bg-red-300/[.035] p-5">
                <h2 className="font-black text-red-100">Referencias rechazadas</h2>
                <label className="mt-3 flex items-start gap-3 text-xs leading-5 text-red-50/55">
                  <input type="checkbox" checked={regenerationConfirmed} onChange={(event) => setRegenerationConfirmed(event.target.checked)} className="mt-1" />
                  <span>Autorizo una nueva compra únicamente para las imágenes rechazadas, con nueva cotización y los mismos topes.</span>
                </label>
                <button type="button" disabled={isBusy || !regenerationConfirmed} onClick={regenerateRejected} className="mt-4 w-full rounded-xl border border-red-200/25 px-4 py-3 text-xs font-black text-red-100 disabled:opacity-30">Regenerar rechazadas</button>
              </section>
            )}

            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-5">
              <h2 className="font-black">Entrega</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">El paquete se guarda en una carpeta local con imágenes, hoja de revisión, manifiesto y auditoría de costes. No se sube a OpenArt.</p>
              <button type="button" disabled={!allApproved || isBusy} onClick={() => exportPackage().catch((error) => commit((current) => ({ ...current, message: error.message })))} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">Exportar paquete aprobado</button>
              <button type="button" disabled={isBusy} onClick={resetAll} className="mt-2 w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/35 transition hover:bg-white/[.04]">Borrar progreso local</button>
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className={`rounded-2xl border px-5 py-4 text-sm ${state.phase === 'stopped' ? 'border-red-300/20 bg-red-300/[.05] text-red-100' : 'border-cyan-300/15 bg-cyan-300/[.035] text-cyan-50/65'}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>{hydrated ? state.message : 'Recuperando el progreso local…'}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{state.phase}</span>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[.08] bg-[#0c0e13] p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${selectedCategory === category ? 'bg-white text-black' : 'border border-white/10 text-white/40 hover:text-white'}`}>
                    {category === 'all' ? 'todas' : category}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {filteredJobs.map((job) => {
                const result = state.jobs[job.id] || INITIAL_JOB;
                const status = result.approved ? 'approved' : result.rejected ? 'rejected' : result.status;
                return (
                  <article key={job.id} className={`overflow-hidden rounded-3xl border bg-[#0c0e13] ${job.calibration ? 'border-amber-300/20' : 'border-white/[.08]'}`}>
                    <div className="relative aspect-[4/3] bg-black/35">
                      {previewUrls[job.id] ? (
                        <img src={previewUrls[job.id]} alt={`Resultado ${job.id}`} className="h-full w-full object-contain" />
                      ) : (
                        <img src={job.source} alt={`Fuente ${job.id}`} className="h-full w-full object-contain opacity-55" />
                      )}
                      <div className="absolute left-3 top-3"><StatusPill status={status} /></div>
                      {job.calibration && <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-950">calibración</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white/85">{job.id}</p>
                          <p className="mt-1 text-[11px] text-white/35">{job.category} · {job.view}</p>
                        </div>
                        <div className="text-right text-[10px] text-white/35">
                          <div>cotizada {money(result.quote)}</div>
                          <div>real {money(result.cost)}</div>
                        </div>
                      </div>
                      {result.progress && <p className="mt-3 text-xs text-amber-100/60">{result.progress}</p>}
                      {result.error && <p className="mt-3 rounded-xl bg-red-300/[.06] p-3 text-xs leading-5 text-red-100/70">{result.error}</p>}
                      {['completed', 'approved', 'rejected'].includes(status) && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => approveJob(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${result.approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-300/20 text-emerald-100'}`}>Aprobar</button>
                          <button type="button" onClick={() => rejectJob(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${result.rejected ? 'bg-red-300 text-red-950' : 'border border-red-300/20 text-red-100'}`}>Rechazar</button>
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
