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

const EMPTY_JOB = {
  status: 'pending',
  quote: null,
  cost: null,
  requestId: null,
  outputUrl: null,
  approved: false,
  rejected: false,
  blobStored: false,
  error: null,
};

function initialState() {
  return {
    version: 3,
    phase: 'idle',
    startingBalance: null,
    liveBalance: null,
    protectedReserve: null,
    spent: 0,
    activeJobId: null,
    chargedRequestIds: [],
    message: 'Comprueba el saldo vivo para calcular la reserva protegida.',
    jobs: Object.fromEntries(pack.jobs.map((job) => [job.id, { ...EMPTY_JOB }])),
  };
}

function restoreState(saved) {
  const base = initialState();
  if (!saved || saved.version !== 3) return base;
  return {
    ...base,
    ...saved,
    jobs: Object.fromEntries(pack.jobs.map((job) => [
      job.id,
      { ...EMPTY_JOB, ...(saved.jobs?.[job.id] || {}) },
    ])),
    chargedRequestIds: Array.isArray(saved.chargedRequestIds) ? saved.chargedRequestIds : [],
  };
}

function finite(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function money(value) {
  return finite(value) ? `$${Number(value).toFixed(4)}` : '—';
}

function deriveReserve(startingBalance) {
  return Math.max(0, Number((Number(startingBalance) - Number(pack.budget.stageCapUsd)).toFixed(4)));
}

function normalizeError(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error); } catch { return 'Error desconocido.'; }
}

function statusLabel(item) {
  if (item.approved) return 'aprobada';
  if (item.rejected) return 'rechazada';
  return {
    pending: 'pendiente',
    preparing: 'preparando',
    quoted: 'cotizada',
    generating: 'generando',
    preserving: 'guardando',
    completed: 'por revisar',
    failed: 'falló',
    'preservation-failed': 'guardar de nuevo',
  }[item.status] || item.status;
}

function statusClass(item) {
  if (item.approved) return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (item.rejected || item.status === 'failed') return 'border-red-300/25 bg-red-300/10 text-red-100';
  if (item.status === 'generating' || item.status === 'preparing') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  if (item.status === 'completed' || item.status === 'preserving') return 'border-violet-300/25 bg-violet-300/10 text-violet-100';
  return 'border-white/10 bg-white/[.04] text-white/40';
}

function Metric({ label, value, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}

export default function LumoReferenceGeneratorV3PageClient() {
  const router = useRouter();
  const stateRef = useRef(initialState());
  const runningRef = useRef(false);
  const objectUrlsRef = useRef({});
  const [state, setState] = useState(initialState);
  const [previews, setPreviews] = useState({});
  const [category, setCategory] = useState('all');
  const [hydrated, setHydrated] = useState(false);

  const commit = useCallback((updater) => {
    const current = stateRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    stateRef.current = next;
    setState(next);
    try { persistState(next); } catch { /* local persistence is optional */ }
    return next;
  }, []);

  const updateJob = useCallback((jobId, patch) => {
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: { ...current.jobs[jobId], ...patch },
      },
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
    let active = true;
    Promise.all(pack.jobs.map(async (job) => {
      const blob = await getGeneratedBlob(job.id).catch(() => null);
      if (active && blob instanceof Blob) setPreview(job.id, blob);
    })).finally(() => active && setHydrated(true));

    return () => {
      active = false;
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
  const activeRequestJob = pack.jobs.find((job) => state.jobs[job.id]?.requestId);
  const busy = runningRef.current || Boolean(state.activeJobId || activeRequestJob);

  const requireKey = () => {
    const key = getStoredMuapiKey();
    if (!key) throw new Error('No se encontró la clave MuAPI guardada. Configúrala en Settings; no la pegues aquí.');
    return key;
  };

  const refreshBalance = useCallback(async () => {
    try {
      const balance = await getLiveBalance(requireKey());
      const startingBalance = finite(stateRef.current.startingBalance)
        ? Number(stateRef.current.startingBalance)
        : balance;
      const protectedReserve = finite(stateRef.current.protectedReserve)
        ? Number(stateRef.current.protectedReserve)
        : deriveReserve(startingBalance);
      commit((current) => ({
        ...current,
        phase: 'ready',
        startingBalance,
        liveBalance: balance,
        protectedReserve,
        message: `Saldo ${money(balance)}. Reserva calculada: ${money(protectedReserve)}.`,
      }));
    } catch (error) {
      commit((current) => ({ ...current, phase: 'stopped', message: normalizeError(error) }));
    }
  }, [commit]);

  const pendingForGeneration = (jobs) => jobs.filter((job) => {
    const item = stateRef.current.jobs[job.id];
    return !item.approved && (!item.outputUrl || item.rejected);
  });

  const preflight = useCallback(async (jobs) => {
    const apiKey = requireKey();
    const liveBalance = await getLiveBalance(apiKey);
    const startingBalance = finite(stateRef.current.startingBalance)
      ? Number(stateRef.current.startingBalance)
      : liveBalance;
    const protectedReserve = finite(stateRef.current.protectedReserve)
      ? Number(stateRef.current.protectedReserve)
      : deriveReserve(startingBalance);
    const prepared = [];
    let quotedTotal = 0;

    for (const job of pendingForGeneration(jobs)) {
      updateJob(job.id, { status: 'preparing', error: null });
      const hostedSource = await ensureHostedSource(apiKey, job.source);
      const payload = buildGenerationPayload(job, hostedSource);
      const quote = await quoteReferenceJob(apiKey, pack.model.endpoint, payload);
      if (!finite(quote.cost)) throw new Error(`${job.id} no recibió una cotización válida.`);
      if (Number(quote.cost) > Number(pack.model.maximumUnitCostUsd)) {
        throw new Error(`${job.id}: ${money(quote.cost)} supera el máximo unitario ${money(pack.model.maximumUnitCostUsd)}.`);
      }
      quotedTotal += Number(quote.cost);
      prepared.push({ job, payload, quote });
      updateJob(job.id, { status: 'quoted', quote: Number(quote.cost), error: null });
    }

    const projectedSpent = Number(stateRef.current.spent || 0) + quotedTotal;
    if (projectedSpent > Number(pack.budget.stageCapUsd) + 1e-9) {
      throw new Error(`El gasto acumulado alcanzaría ${money(projectedSpent)}, por encima del tope ${money(pack.budget.stageCapUsd)}.`);
    }
    if (liveBalance - quotedTotal < protectedReserve - 1e-9) {
      throw new Error(`El lote dejaría ${money(liveBalance - quotedTotal)}, por debajo de la reserva calculada ${money(protectedReserve)}.`);
    }

    commit((current) => ({
      ...current,
      startingBalance,
      liveBalance,
      protectedReserve,
      message: prepared.length
        ? `${prepared.length} referencia(s) cotizadas por ${money(quotedTotal)} como máximo.`
        : 'No hay nuevas referencias que comprar en esta fase.',
    }));
    return { apiKey, prepared, protectedReserve };
  }, [commit, updateJob]);

  const preserve = useCallback(async (job, outputUrl) => {
    try {
      updateJob(job.id, { status: 'preserving', error: null });
      const blob = await fetchGeneratedImageBlob(outputUrl);
      await putGeneratedBlob(job.id, blob);
      setPreview(job.id, blob);
      updateJob(job.id, { status: 'completed', blobStored: true, error: null });
    } catch (error) {
      updateJob(job.id, {
        status: 'preservation-failed',
        blobStored: false,
        error: normalizeError(error),
      });
      throw error;
    }
  }, [setPreview, updateJob]);

  const recordResult = useCallback((job, result, quote, requestId) => {
    const outputUrl = result.url;
    if (!outputUrl) throw new Error(`${job.id} terminó sin imagen.`);
    const chargeId = requestId || `direct:${outputUrl}`;
    const cost = finite(result.cost) ? Number(result.cost) : Number(quote.cost);
    const alreadyCounted = stateRef.current.chargedRequestIds.includes(chargeId);

    commit((current) => ({
      ...current,
      activeJobId: null,
      liveBalance: finite(result.balanceAfter) ? Number(result.balanceAfter) : current.liveBalance,
      spent: alreadyCounted ? current.spent : Number(current.spent || 0) + cost,
      chargedRequestIds: alreadyCounted ? current.chargedRequestIds : [...current.chargedRequestIds, chargeId],
      jobs: {
        ...current.jobs,
        [job.id]: {
          ...current.jobs[job.id],
          status: 'preserving',
          quote: Number(quote.cost),
          cost,
          requestId: null,
          outputUrl,
          approved: false,
          rejected: false,
          error: null,
        },
      },
    }));
    return outputUrl;
  }, [commit]);

  const execute = useCallback(async (prepared, apiKey, protectedReserve) => {
    const { job, payload, quote } = prepared;
    const liveBalance = await getLiveBalance(apiKey);
    if (Number(stateRef.current.spent || 0) + Number(quote.cost) > Number(pack.budget.stageCapUsd) + 1e-9) {
      throw new Error(`${job.id} superaría el tope total.`);
    }
    if (liveBalance - Number(quote.cost) < protectedReserve - 1e-9) {
      throw new Error(`${job.id} vulneraría la reserva protegida ${money(protectedReserve)}.`);
    }

    commit((current) => ({
      ...current,
      phase: 'generating',
      activeJobId: job.id,
      liveBalance,
      message: `Generando ${job.id}. No cierres la pestaña.`,
      jobs: {
        ...current.jobs,
        [job.id]: { ...current.jobs[job.id], status: 'generating', error: null },
      },
    }));

    const submission = await submitReferenceJob(apiKey, pack.model.endpoint, payload);
    if (submission.requestId) updateJob(job.id, { requestId: submission.requestId, status: 'generating' });

    if (submission.directUrl) {
      const outputUrl = recordResult(job, {
        url: submission.directUrl,
        cost: submission.submitCost,
        balanceAfter: submission.balanceAfter,
      }, quote, submission.requestId);
      await preserve(job, outputUrl);
      return;
    }
    if (!submission.requestId) throw new Error(`${job.id} no devolvió request_id ni imagen.`);

    const result = await pollReferenceJob(apiKey, submission.requestId, {
      onProgress: ({ attempt, attempts, status }) => updateJob(job.id, {
        status: 'generating',
        error: null,
        progress: `${status || 'procesando'} ${attempt}/${attempts}`,
      }),
    });
    const outputUrl = recordResult(job, result, quote, submission.requestId);
    await preserve(job, outputUrl);
  }, [commit, preserve, recordResult, updateJob]);

  const runSequence = useCallback(async (jobs, label) => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      commit((current) => ({ ...current, phase: 'preflight', message: `Preparando ${label}…` }));
      const { apiKey, prepared, protectedReserve } = await preflight(jobs);
      for (const item of prepared) await execute(item, apiKey, protectedReserve);
      commit((current) => ({
        ...current,
        phase: 'review',
        activeJobId: null,
        message: prepared.length
          ? `${label} terminada. Revisa las imágenes antes de aprobar.`
          : 'No se realizó ninguna compra nueva.',
      }));
    } catch (error) {
      const message = normalizeError(error);
      const activeId = stateRef.current.activeJobId;
      const hasRequest = activeId && stateRef.current.jobs[activeId]?.requestId;
      commit((current) => ({
        ...current,
        phase: 'stopped',
        activeJobId: hasRequest ? activeId : null,
        message,
        jobs: activeId && !hasRequest ? {
          ...current.jobs,
          [activeId]: { ...current.jobs[activeId], status: 'failed', error: message },
        } : current.jobs,
      }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, execute, preflight]);

  const resumeRequest = useCallback(async () => {
    if (runningRef.current) return;
    const job = pack.jobs.find((entry) => stateRef.current.jobs[entry.id]?.requestId);
    const requestId = job && stateRef.current.jobs[job.id]?.requestId;
    if (!job || !requestId) return;
    runningRef.current = true;
    try {
      const apiKey = requireKey();
      commit((current) => ({ ...current, activeJobId: job.id, phase: 'generating', message: `Reanudando ${job.id}; no se enviará otra compra.` }));
      const result = await pollReferenceJob(apiKey, requestId);
      const quote = { cost: stateRef.current.jobs[job.id]?.quote };
      const outputUrl = recordResult(job, result, quote, requestId);
      await preserve(job, outputUrl);
      commit((current) => ({ ...current, phase: 'review', activeJobId: null, message: `${job.id} recuperada.` }));
    } catch (error) {
      commit((current) => ({ ...current, phase: 'stopped', message: normalizeError(error) }));
    } finally {
      runningRef.current = false;
    }
  }, [commit, preserve, recordResult]);

  const approve = useCallback((jobId) => {
    if (!stateRef.current.jobs[jobId]?.blobStored) return;
    updateJob(jobId, { approved: true, rejected: false, status: 'completed', error: null });
  }, [updateJob]);

  const reject = useCallback((jobId) => {
    updateJob(jobId, { approved: false, rejected: true, status: 'completed' });
  }, [updateJob]);

  const regenerateRejected = useCallback(async () => {
    const rejected = pack.jobs.filter((job) => stateRef.current.jobs[job.id]?.rejected);
    if (!rejected.length || !window.confirm(`Se realizará una compra nueva para ${rejected.length} referencia(s) rechazada(s). ¿Continuar?`)) return;
    for (const job of rejected) {
      await deleteGeneratedBlob(job.id).catch(() => {});
      updateJob(job.id, { ...EMPTY_JOB });
    }
    await runSequence(rejected, 'regeneración autorizada');
  }, [runSequence, updateJob]);

  const exportApproved = useCallback(async () => {
    if (!allApproved) return;
    const manifest = {
      packId: pack.id,
      exportedAt: new Date().toISOString(),
      startingBalanceUsd: stateRef.current.startingBalance,
      protectedReserveUsd: stateRef.current.protectedReserve,
      finalLiveBalanceUsd: stateRef.current.liveBalance,
      spentUsd: stateRef.current.spent,
      files: [],
    };
    for (const job of pack.jobs) {
      const blob = await getGeneratedBlob(job.id);
      if (!(blob instanceof Blob)) throw new Error(`Falta la imagen local de ${job.id}.`);
      const filename = safeFileName(job.id, blob);
      manifest.files.push({ id: job.id, category: job.category, filename, costUsd: stateRef.current.jobs[job.id]?.cost });
      await downloadBlob(blob, filename);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    await downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), 'manifest.json');
    commit((current) => ({ ...current, message: 'Paquete descargado. El navegador puede solicitar permiso para varios archivos.' }));
  }, [allApproved, commit]);

  const reset = useCallback(async () => {
    if (runningRef.current) return;
    for (const job of pack.jobs) await deleteGeneratedBlob(job.id).catch(() => {});
    Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = {};
    setPreviews({});
    clearPersistedState();
    const next = initialState();
    stateRef.current = next;
    setState(next);
  }, []);

  const rejectedCount = pack.jobs.filter((job) => state.jobs[job.id]?.rejected).length;

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.13),transparent_35%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200/70">MuAPI Canon Pack Guard · v3</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Referencias canónicas para OpenArt</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">La reserva se calcula con el saldo vivo: saldo inicial menos el tope autorizado de {money(pack.budget.stageCapUsd)}. No depende de cifras antiguas.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value={`${approvedCount}/${pack.jobs.length}`} label="aprobadas" accent="text-emerald-200" />
              <Metric value={`${generatedCount}/${pack.jobs.length}`} label="con salida" />
              <Metric value={money(state.spent)} label="gastado" accent="text-amber-200" />
              <Metric value={money(state.liveBalance)} label="saldo vivo" accent="text-cyan-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Protección económica viva</h2>
              <div className="mt-4 space-y-2 text-xs text-white/45">
                <div className="flex justify-between"><span>Saldo inicial</span><strong>{money(state.startingBalance)}</strong></div>
                <div className="flex justify-between"><span>Tope autorizado</span><strong className="text-amber-100">{money(pack.budget.stageCapUsd)}</strong></div>
                <div className="flex justify-between"><span>Reserva calculada</span><strong className="text-emerald-100">{money(state.protectedReserve)}</strong></div>
                <div className="flex justify-between"><span>Máximo por imagen</span><strong>{money(pack.model.maximumUnitCostUsd)}</strong></div>
                <div className="flex justify-between"><span>Reintentos automáticos</span><strong>0</strong></div>
              </div>
              <button type="button" disabled={busy} onClick={refreshBalance} className="mt-4 w-full rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-xs font-black text-cyan-100 disabled:opacity-35">Comprobar saldo vivo</button>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-100/60">Fase 1</p>
              <h2 className="mt-2 font-black text-amber-50">Calibrar Nara y Pompón</h2>
              <p className="mt-2 text-xs leading-5 text-amber-50/45">Solo dos imágenes. Coste esperado: {money(pack.calibration.jobIds.length * pack.model.expectedUnitCostUsd)}.</p>
              <button type="button" disabled={busy || calibrationApproved || !finite(state.protectedReserve)} onClick={() => runSequence(calibrationJobs, 'calibración')} className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-amber-950 disabled:opacity-35">{calibrationApproved ? 'Calibración aprobada ✓' : 'Generar calibración protegida'}</button>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Lote restante</h2>
              <p className="mt-2 text-xs leading-5 text-white/40">{remainingJobs.length} referencias. Bloqueado hasta aprobar Nara y Pompón.</p>
              <button type="button" disabled={busy || !calibrationApproved || remainingJobs.every((job) => state.jobs[job.id]?.approved)} onClick={() => runSequence(remainingJobs, 'lote restante')} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-emerald-950 disabled:opacity-30">Generar lote restante</button>
            </section>

            {activeRequestJob && (
              <section className="rounded-3xl border border-violet-300/20 bg-violet-300/[.05] p-5">
                <h2 className="font-black text-violet-100">Solicitud pendiente</h2>
                <p className="mt-2 text-xs text-violet-50/45">Reanudar solo consulta el request_id guardado.</p>
                <button type="button" onClick={resumeRequest} className="mt-4 w-full rounded-xl bg-violet-300 px-4 py-3 text-xs font-black text-violet-950">Reanudar sin comprar</button>
              </section>
            )}

            {rejectedCount > 0 && (
              <button type="button" disabled={busy} onClick={regenerateRejected} className="w-full rounded-2xl border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-xs font-black text-red-100">Regenerar {rejectedCount} rechazada(s)</button>
            )}

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <button type="button" disabled={!allApproved || busy} onClick={() => exportApproved().catch((error) => commit((current) => ({ ...current, message: normalizeError(error) })))} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-30">Descargar paquete aprobado</button>
              <button type="button" disabled={busy} onClick={reset} className="mt-2 w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/35">Borrar progreso local</button>
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className={`rounded-2xl border px-5 py-4 text-sm ${state.phase === 'stopped' ? 'border-red-300/20 bg-red-300/[.05] text-red-100' : 'border-cyan-300/15 bg-cyan-300/[.035] text-cyan-50/65'}`}>
              {hydrated ? state.message : 'Recuperando progreso local…'}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${category === item ? 'bg-white text-black' : 'border border-white/10 text-white/40'}`}>{item === 'all' ? 'todas' : item}</button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleJobs.map((job) => {
                const item = state.jobs[job.id] || EMPTY_JOB;
                const canReview = item.blobStored && item.status === 'completed';
                return (
                  <article key={job.id} className={`overflow-hidden rounded-3xl border bg-[#0c0e13] ${job.calibration ? 'border-amber-300/20' : 'border-white/10'}`}>
                    <div className="relative aspect-[4/3] bg-black/35">
                      <img src={previews[job.id] || job.source} alt={job.id} className={`h-full w-full object-contain ${previews[job.id] ? '' : 'opacity-55'}`} />
                      <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item)}`}>{statusLabel(item)}</span>
                      {job.calibration && <span className="absolute right-3 top-3 rounded-full bg-amber-300 px-2.5 py-1 text-[9px] font-black uppercase text-amber-950">calibración</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between gap-3">
                        <div><p className="text-sm font-black text-white/85">{job.id}</p><p className="mt-1 text-[11px] text-white/35">{job.category} · {job.view}</p></div>
                        <div className="text-right text-[10px] text-white/35"><div>cotizada {money(item.quote)}</div><div>real {money(item.cost)}</div></div>
                      </div>
                      {item.progress && <p className="mt-3 text-xs text-amber-100/60">{item.progress}</p>}
                      {item.error && <p className="mt-3 rounded-xl bg-red-300/[.06] p-3 text-xs text-red-100/70">{item.error}</p>}
                      {item.status === 'preservation-failed' && item.outputUrl && <button type="button" onClick={() => preserve(job, item.outputUrl).catch(() => {})} className="mt-4 w-full rounded-xl border border-orange-300/20 px-3 py-2.5 text-xs font-black text-orange-100">Guardar salida sin generar otra</button>}
                      {canReview && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => approve(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${item.approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-300/20 text-emerald-100'}`}>Aprobar</button>
                          <button type="button" onClick={() => reject(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${item.rejected ? 'bg-red-300 text-red-950' : 'border border-red-300/20 text-red-100'}`}>Rechazar</button>
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
