'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import pack from '../../../../content/production/Lumo-OpenArt-reference-pack-v1.json';
import {
  downloadBlob,
  getGeneratedBlob,
  persistState,
  readPersistedState,
  safeFileName,
} from '../../../../lib/kids/production/reference-pack-client';

const AUTOMATIC_EXCLUSIONS = {
  'CHAR-TUNO-threeQuarter-v1': 'La cara, el vestuario y la mochila cambian respecto a Tuno frontal aprobado.',
  'ENV-BRILLAVALLE-mist-path-v1': 'Introduce otra geografía, iluminación diurna y arquitectura ajena a Brillavalle nocturno.',
  'PROP-FOUNTAIN-off-v1': 'La forma de la fuente cambia por completo; no es el mismo objeto apagado.',
  'PROP-FOUNTAIN-restoring-v1': 'La forma, el pedestal y los adornos no coinciden con la Fuente de Luz aprobada.',
};

const REVIEW_WARNINGS = {
  'PROP-NUBLO-lantern-backpack-v1': 'Parece una mochila escolar moderna. Comprueba que coincida exactamente con el accesorio de Nublo antes de aprobar.',
  'CAST-main-six-scale-lineup-v1': 'Úsala solo para escala. En OpenArt deben tener prioridad las referencias individuales de cada personaje.',
};

const EMPTY_REVIEW = {
  approved: false,
  rejected: false,
  excluded: false,
  exclusionReason: null,
  blobStored: false,
  cost: null,
  outputUrl: null,
  status: 'pending',
};

function migrateState(saved) {
  const previousJobs = saved?.jobs || {};
  return {
    ...(saved || {}),
    version: 4,
    phase: 'review-only',
    message: 'Revisión sin coste activa. Las referencias incoherentes se retiran; no se regeneran.',
    jobs: Object.fromEntries(pack.jobs.map((job) => {
      const previous = { ...EMPTY_REVIEW, ...(previousJobs[job.id] || {}) };
      const automaticReason = AUTOMATIC_EXCLUSIONS[job.id];
      return [job.id, {
        ...previous,
        approved: automaticReason ? false : Boolean(previous.approved),
        rejected: automaticReason ? true : Boolean(previous.rejected),
        excluded: automaticReason ? true : Boolean(previous.excluded),
        exclusionReason: automaticReason || previous.exclusionReason || null,
      }];
    })),
  };
}

function status(item) {
  if (item.excluded) return { label: 'retirada', style: 'border-orange-300/25 bg-orange-300/10 text-orange-100' };
  if (item.approved) return { label: 'aprobada', style: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' };
  if (item.rejected) return { label: 'rechazada', style: 'border-red-300/25 bg-red-300/10 text-red-100' };
  if (item.blobStored) return { label: 'por revisar', style: 'border-violet-300/25 bg-violet-300/10 text-violet-100' };
  return { label: 'sin archivo', style: 'border-white/10 bg-white/[.04] text-white/40' };
}

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(4)}` : '—';
}

function Metric({ value, label, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}

async function createContactSheet(jobs, blobs) {
  const columns = 5;
  const width = 360;
  const imageHeight = 245;
  const labelHeight = 48;
  const rows = Math.ceil(jobs.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = columns * width;
  canvas.height = Math.max(1, rows) * (imageHeight + labelHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la hoja de revisión.');
  context.fillStyle = '#07090d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 13px Arial';
  context.textBaseline = 'middle';

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const blob = blobs[job.id];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = column * width;
    const y = row * (imageHeight + labelHeight);
    context.fillStyle = '#020305';
    context.fillRect(x, y, width, imageHeight);
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(width / bitmap.width, imageHeight / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    context.drawImage(bitmap, x + (width - drawWidth) / 2, y + (imageHeight - drawHeight) / 2, drawWidth, drawHeight);
    bitmap.close();
    context.fillStyle = '#121722';
    context.fillRect(x, y + imageHeight, width, labelHeight);
    context.fillStyle = '#effaff';
    context.fillText(job.id.slice(0, 42), x + 10, y + imageHeight + labelHeight / 2);
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo exportar la hoja de revisión.')), 'image/png');
  });
}

export default function LumoReferenceReviewV4PageClient() {
  const router = useRouter();
  const objectUrlsRef = useRef({});
  const [state, setState] = useState(() => migrateState(null));
  const [previews, setPreviews] = useState({});
  const [category, setCategory] = useState('all');
  const [hydrated, setHydrated] = useState(false);
  const [exporting, setExporting] = useState(false);

  const commit = useCallback((updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      try { persistState(next); } catch { /* La revisión sigue funcionando. */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const migrated = migrateState(readPersistedState());
    setState(migrated);
    try { persistState(migrated); } catch { /* opcional */ }
    let active = true;
    Promise.all(pack.jobs.map(async (job) => {
      const blob = await getGeneratedBlob(job.id).catch(() => null);
      if (!active || !(blob instanceof Blob)) return;
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current[job.id] = url;
      setPreviews((current) => ({ ...current, [job.id]: url }));
      commit((current) => ({
        ...current,
        jobs: {
          ...current.jobs,
          [job.id]: { ...current.jobs[job.id], blobStored: true },
        },
      }));
    })).finally(() => active && setHydrated(true));

    return () => {
      active = false;
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commit]);

  const categories = useMemo(() => ['all', ...new Set(pack.jobs.map((job) => job.category))], []);
  const visibleJobs = useMemo(
    () => category === 'all' ? pack.jobs : pack.jobs.filter((job) => job.category === category),
    [category],
  );

  const approvedJobs = pack.jobs.filter((job) => state.jobs[job.id]?.approved && !state.jobs[job.id]?.excluded);
  const excludedJobs = pack.jobs.filter((job) => state.jobs[job.id]?.excluded);
  const pendingJobs = pack.jobs.filter((job) => {
    const item = state.jobs[job.id];
    return item?.blobStored && !item.approved && !item.excluded;
  });
  const missingJobs = pack.jobs.filter((job) => !state.jobs[job.id]?.blobStored);
  const readyToExport = approvedJobs.length > 0 && pendingJobs.length === 0 && missingJobs.length === 0;

  const approve = useCallback((jobId) => {
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: {
          ...current.jobs[jobId],
          approved: true,
          rejected: false,
          excluded: false,
          exclusionReason: null,
        },
      },
      message: `${jobId} aprobada para el paquete final.`,
    }));
  }, [commit]);

  const exclude = useCallback((jobId, reason) => {
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: {
          ...current.jobs[jobId],
          approved: false,
          rejected: true,
          excluded: true,
          exclusionReason: reason || 'No coincide con el canon aprobado.',
        },
      },
      message: `${jobId} retirada sin generar otra imagen ni consumir créditos.`,
    }));
  }, [commit]);

  const returnToReview = useCallback((jobId) => {
    commit((current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [jobId]: {
          ...current.jobs[jobId],
          approved: false,
          rejected: false,
          excluded: false,
          exclusionReason: null,
        },
      },
      message: `${jobId} vuelve a estar pendiente de revisión.`,
    }));
  }, [commit]);

  const exportPackage = useCallback(async () => {
    if (!readyToExport || exporting) return;
    setExporting(true);
    try {
      const blobs = {};
      for (const job of approvedJobs) {
        const blob = await getGeneratedBlob(job.id);
        if (!(blob instanceof Blob)) throw new Error(`Falta la copia local de ${job.id}.`);
        blobs[job.id] = blob;
      }
      const contactSheet = await createContactSheet(approvedJobs, blobs);
      const manifest = {
        packId: pack.id,
        reviewVersion: 4,
        exportedAt: new Date().toISOString(),
        financials: {
          startingBalanceUsd: state.startingBalance ?? null,
          liveBalanceUsd: state.liveBalance ?? null,
          spentUsd: state.spent ?? null,
          noNewGenerationDuringReview: true,
        },
        uploadRules: {
          uploadApprovedFilesOnly: true,
          individualCharacterReferencesHavePriority: true,
          scaleLineupRole: 'relative-scale-only',
          neverUploadExcludedFiles: true,
        },
        approved: approvedJobs.map((job) => ({
          id: job.id,
          category: job.category,
          filename: safeFileName(job.id, blobs[job.id]),
          warning: REVIEW_WARNINGS[job.id] || null,
        })),
        excluded: excludedJobs.map((job) => ({
          id: job.id,
          category: job.category,
          reason: state.jobs[job.id]?.exclusionReason || 'No coincide con el canon.',
        })),
      };

      const writeFile = async (directory, name, blob) => {
        const handle = await directory.getFileHandle(name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      };

      if (typeof window.showDirectoryPicker === 'function') {
        const root = await window.showDirectoryPicker({ mode: 'readwrite' });
        const folder = await root.getDirectoryHandle('Lumo_OpenArt_Canonical_Pack_Approved_v2', { create: true });
        for (const categoryName of new Set(approvedJobs.map((job) => job.category))) {
          await folder.getDirectoryHandle(categoryName, { create: true });
        }
        for (const job of approvedJobs) {
          const directory = await folder.getDirectoryHandle(job.category, { create: true });
          await writeFile(directory, safeFileName(job.id, blobs[job.id]), blobs[job.id]);
        }
        await writeFile(folder, '00_REVISION_GENERAL.png', contactSheet);
        await writeFile(folder, 'manifest.json', new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }));
      } else {
        await downloadBlob(contactSheet, '00_REVISION_GENERAL.png');
        await downloadBlob(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), 'manifest.json');
        for (const job of approvedJobs) {
          await downloadBlob(blobs[job.id], safeFileName(job.id, blobs[job.id]));
          await new Promise((resolve) => window.setTimeout(resolve, 120));
        }
      }

      commit((current) => ({
        ...current,
        message: `Paquete exportado con ${approvedJobs.length} referencias aprobadas y ${excludedJobs.length} retiradas.`,
      }));
    } catch (error) {
      commit((current) => ({
        ...current,
        message: error instanceof Error ? error.message : 'No se pudo exportar el paquete.',
      }));
    } finally {
      setExporting(false);
    }
  }, [approvedJobs, commit, excludedJobs, exporting, readyToExport, state]);

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.13),transparent_35%),radial-gradient(circle_at_95%_0%,rgba(249,115,22,.09),transparent_30%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200/70">Canon Review Guard · v4 · coste cero</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Revisión final para OpenArt</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">Las imágenes que cambian el canon se retiran del paquete. Esta pantalla no contiene botones de generación, no llama a MuAPI y no puede consumir más saldo.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value={approvedJobs.length} label="aprobadas" accent="text-emerald-200" />
              <Metric value={excludedJobs.length} label="retiradas" accent="text-orange-200" />
              <Metric value={pendingJobs.length} label="por revisar" />
              <Metric value={money(state.spent)} label="gastado previamente" accent="text-amber-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
            <section className="rounded-3xl border border-orange-300/15 bg-orange-300/[.035] p-5">
              <h2 className="font-black text-orange-100">Retiradas automáticamente</h2>
              <p className="mt-2 text-xs leading-5 text-orange-50/45">Se identificaron cuatro resultados que contradicen referencias aprobadas. Permanecen guardados para auditoría, pero nunca se exportarán ni subirán a OpenArt.</p>
              <div className="mt-4 space-y-3">
                {Object.entries(AUTOMATIC_EXCLUSIONS).map(([id, reason]) => (
                  <div key={id} className="rounded-xl border border-orange-200/10 bg-black/20 p-3">
                    <p className="text-[11px] font-black text-orange-100">{id}</p>
                    <p className="mt-1 text-[11px] leading-5 text-orange-50/40">{reason}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Estado de la entrega</h2>
              <div className="mt-4 space-y-2 text-xs text-white/45">
                <div className="flex justify-between"><span>Archivos aprobados</span><strong className="text-emerald-100">{approvedJobs.length}</strong></div>
                <div className="flex justify-between"><span>Retirados</span><strong className="text-orange-100">{excludedJobs.length}</strong></div>
                <div className="flex justify-between"><span>Pendientes</span><strong>{pendingJobs.length}</strong></div>
                <div className="flex justify-between"><span>Sin copia local</span><strong>{missingJobs.length}</strong></div>
                <div className="flex justify-between"><span>Saldo registrado</span><strong>{money(state.liveBalance)}</strong></div>
              </div>
              <button type="button" disabled={!readyToExport || exporting} onClick={exportPackage} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">
                {exporting ? 'Exportando…' : `Exportar ${approvedJobs.length} aprobadas`}
              </button>
              {!readyToExport && <p className="mt-3 text-[11px] leading-5 text-white/30">Revisa todos los archivos restantes. Cada uno debe quedar aprobado o retirado.</p>}
            </section>

            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-5 text-xs leading-5 text-emerald-50/50">
              <strong className="text-emerald-100">Regla para OpenArt:</strong> sube solo el contenido de la carpeta exportada. No subas manualmente las cuatro referencias retiradas, aunque sigan visibles en el historial local.
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] px-5 py-4 text-sm text-cyan-50/65">
              {hydrated ? state.message : 'Recuperando resultados y decisiones locales…'}
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
                const item = state.jobs[job.id] || EMPTY_REVIEW;
                const badge = status(item);
                const warning = REVIEW_WARNINGS[job.id];
                return (
                  <article key={job.id} className={`overflow-hidden rounded-3xl border bg-[#0c0e13] ${item.excluded ? 'border-orange-300/20' : 'border-white/10'}`}>
                    <div className="relative aspect-[4/3] bg-black/35">
                      <img src={previews[job.id] || job.source} alt={job.id} className={`h-full w-full object-contain ${previews[job.id] ? '' : 'opacity-45'}`} />
                      <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${badge.style}`}>{badge.label}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-black text-white/85">{job.id}</p>
                      <p className="mt-1 text-[11px] text-white/35">{job.category} · {job.view}</p>
                      {warning && <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.04] p-3 text-[11px] leading-5 text-amber-50/55">{warning}</p>}
                      {item.exclusionReason && <p className="mt-3 rounded-xl border border-orange-300/10 bg-orange-300/[.04] p-3 text-[11px] leading-5 text-orange-50/55">{item.exclusionReason}</p>}

                      {item.blobStored && !item.excluded && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => approve(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${item.approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-300/20 text-emerald-100'}`}>Aprobar</button>
                          <button type="button" onClick={() => exclude(job.id, 'Retirada durante la revisión humana porque no coincide con el canon aprobado.')} className="rounded-xl border border-orange-300/20 px-3 py-2.5 text-xs font-black text-orange-100">Retirar</button>
                        </div>
                      )}

                      {item.excluded && !AUTOMATIC_EXCLUSIONS[job.id] && (
                        <button type="button" onClick={() => returnToReview(job.id)} className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2.5 text-xs font-black text-white/45">Volver a revisar</button>
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
