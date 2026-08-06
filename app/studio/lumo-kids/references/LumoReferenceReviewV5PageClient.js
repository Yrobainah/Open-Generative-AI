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

const FORCED_EXCLUSIONS = {
  'CHAR-TUNO-threeQuarter-v1': 'No coincide con el Tuno frontal aprobado: cambia rostro, ropa y mochila.',
  'ENV-BRILLAVALLE-mist-path-v1': 'Cambia la geografía, la arquitectura y la iluminación de Brillavalle.',
  'PROP-FOUNTAIN-off-v1': 'No es la misma Fuente de Luz en estado apagado.',
  'PROP-FOUNTAIN-restoring-v1': 'Cambia la forma, el pedestal y los adornos de la Fuente de Luz.',
};

const WARNINGS = {
  'PROP-NUBLO-lantern-backpack-v1': 'Comprueba que no parezca una mochila escolar moderna antes de aprobarla.',
  'CAST-main-six-scale-lineup-v1': 'Usar solo como referencia de escala; las referencias individuales tienen prioridad.',
};

const EMPTY = {
  approved: false,
  rejected: false,
  excluded: false,
  exclusionReason: null,
  blobStored: false,
  cost: null,
  outputUrl: null,
};

function migrate(saved) {
  const previous = saved?.jobs || {};
  return {
    ...(saved || {}),
    version: 5,
    phase: 'review-only',
    message: 'Modo de revisión y descarga ZIP. No se realizan generaciones ni se consume saldo.',
    jobs: Object.fromEntries(pack.jobs.map((job) => {
      const old = { ...EMPTY, ...(previous[job.id] || {}) };
      const forced = FORCED_EXCLUSIONS[job.id];
      const excluded = Boolean(forced || old.excluded || old.rejected);
      return [job.id, {
        ...old,
        approved: excluded ? false : Boolean(old.approved),
        rejected: excluded,
        excluded,
        exclusionReason: forced || old.exclusionReason || (old.rejected ? 'Rechazada durante la revisión humana.' : null),
      }];
    })),
  };
}

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(4)}` : '—';
}

function badge(item) {
  if (item.excluded) return ['retirada', 'border-orange-300/25 bg-orange-300/10 text-orange-100'];
  if (item.approved) return ['aprobada', 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'];
  if (item.blobStored) return ['por revisar', 'border-violet-300/25 bg-violet-300/10 text-violet-100'];
  return ['sin archivo', 'border-white/10 bg-white/[.04] text-white/40'];
}

function Metric({ value, label, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
      <div className={`text-lg font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
    </div>
  );
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31),
    date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31),
  };
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function joinBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

async function createStoredZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const stamp = dosTimestamp();

  for (const entry of entries) {
    const name = encoder.encode(entry.name.replaceAll('\\', '/'));
    const data = entry.data instanceof Uint8Array
      ? entry.data
      : new Uint8Array(await entry.data.arrayBuffer());
    const crc = crc32(data);

    const localHeader = joinBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(stamp.time),
      uint16(stamp.date),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    localParts.push(localHeader, data);

    const centralHeader = joinBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(stamp.time),
      uint16(stamp.date),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(name.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(localOffset),
      name,
    ]);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + data.length;
  }

  const centralDirectory = joinBytes(centralParts);
  const end = joinBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(localOffset),
    uint16(0),
  ]);
  return new Blob([...localParts, centralDirectory, end], { type: 'application/zip' });
}

async function contactSheet(jobs, blobs) {
  const columns = 4;
  const cellWidth = 420;
  const imageHeight = 285;
  const labelHeight = 48;
  const rows = Math.ceil(jobs.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellWidth;
  canvas.height = Math.max(1, rows) * (imageHeight + labelHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la hoja de revisión.');
  context.fillStyle = '#07090d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.font = 'bold 14px Arial';

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const bitmap = await createImageBitmap(blobs[job.id]);
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * (imageHeight + labelHeight);
    const scale = Math.min(cellWidth / bitmap.width, imageHeight / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.fillStyle = '#020305';
    context.fillRect(x, y, cellWidth, imageHeight);
    context.drawImage(bitmap, x + (cellWidth - width) / 2, y + (imageHeight - height) / 2, width, height);
    bitmap.close();
    context.fillStyle = '#121722';
    context.fillRect(x, y + imageHeight, cellWidth, labelHeight);
    context.fillStyle = '#effaff';
    context.fillText(job.id.slice(0, 48), x + 10, y + imageHeight + labelHeight / 2);
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo exportar la hoja de revisión.')), 'image/png');
  });
}

export default function LumoReferenceReviewV5PageClient() {
  const router = useRouter();
  const objectUrls = useRef({});
  const [state, setState] = useState(() => migrate(null));
  const [previews, setPreviews] = useState({});
  const [category, setCategory] = useState('all');
  const [hydrated, setHydrated] = useState(false);
  const [exporting, setExporting] = useState(false);

  const commit = useCallback((updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      try { persistState(next); } catch { /* opcional */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const restored = migrate(readPersistedState());
    setState(restored);
    try { persistState(restored); } catch { /* opcional */ }
    let active = true;
    Promise.all(pack.jobs.map(async (job) => {
      const blob = await getGeneratedBlob(job.id).catch(() => null);
      if (!active || !(blob instanceof Blob)) return;
      const url = URL.createObjectURL(blob);
      objectUrls.current[job.id] = url;
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
      Object.values(objectUrls.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commit]);

  const categories = useMemo(() => ['all', ...new Set(pack.jobs.map((job) => job.category))], []);
  const visible = useMemo(() => category === 'all' ? pack.jobs : pack.jobs.filter((job) => job.category === category), [category]);
  const approved = pack.jobs.filter((job) => state.jobs[job.id]?.approved && state.jobs[job.id]?.blobStored && !state.jobs[job.id]?.excluded);
  const excluded = pack.jobs.filter((job) => state.jobs[job.id]?.excluded);
  const pending = pack.jobs.filter((job) => state.jobs[job.id]?.blobStored && !state.jobs[job.id]?.approved && !state.jobs[job.id]?.excluded);
  const missing = pack.jobs.filter((job) => !state.jobs[job.id]?.blobStored);
  const canExport = approved.length > 0 && !exporting;

  const approve = useCallback((jobId) => {
    commit((current) => ({
      ...current,
      jobs: { ...current.jobs, [jobId]: { ...current.jobs[jobId], approved: true, rejected: false, excluded: false, exclusionReason: null } },
      message: `${jobId} aprobada.`,
    }));
  }, [commit]);

  const exclude = useCallback((jobId, reason = 'Retirada porque no coincide con el canon aprobado.') => {
    commit((current) => ({
      ...current,
      jobs: { ...current.jobs, [jobId]: { ...current.jobs[jobId], approved: false, rejected: true, excluded: true, exclusionReason: reason } },
      message: `${jobId} retirada. No se generará otra imagen.`,
    }));
  }, [commit]);

  const exportZip = useCallback(async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const blobs = {};
      for (const job of approved) {
        const blob = await getGeneratedBlob(job.id);
        if (blob instanceof Blob) blobs[job.id] = blob;
      }
      const actualApproved = approved.filter((job) => blobs[job.id]);
      if (!actualApproved.length) throw new Error('No se encontró ninguna imagen aprobada en el almacenamiento local.');
      const sheet = await contactSheet(actualApproved, blobs);
      const manifest = {
        packId: pack.id,
        reviewVersion: 5,
        exportedAt: new Date().toISOString(),
        financials: {
          startingBalanceUsd: state.startingBalance ?? null,
          liveBalanceUsd: state.liveBalance ?? null,
          spentUsd: state.spent ?? null,
          newGenerationCostUsd: 0,
        },
        rules: {
          uploadOnlyApprovedFolder: true,
          individualCharacterReferencesHavePriority: true,
          excludedFilesMustNeverBeUploaded: true,
        },
        approved: actualApproved.map((job) => ({
          id: job.id,
          category: job.category,
          filename: `${job.category}/${safeFileName(job.id, blobs[job.id])}`,
          warning: WARNINGS[job.id] || null,
        })),
        excluded: excluded.map((job) => ({ id: job.id, reason: state.jobs[job.id]?.exclusionReason || 'Retirada.' })),
        pendingNotExported: pending.map((job) => job.id),
        missingNotExported: missing.map((job) => job.id),
      };
      const readme = [
        'LUMO — PAQUETE CANÓNICO APROBADO PARA OPENART',
        '',
        `Referencias incluidas: ${actualApproved.length}`,
        `Referencias retiradas: ${excluded.length}`,
        `Pendientes no incluidas: ${pending.length}`,
        `Ausentes no incluidas: ${missing.length}`,
        '',
        'Sube a OpenArt únicamente las imágenes incluidas en este ZIP.',
        'Las referencias individuales de personaje tienen prioridad sobre la alineación de escala.',
        'No subas las imágenes retiradas ni las que permanezcan pendientes.',
      ].join('\n');
      const encoder = new TextEncoder();
      const entries = [
        { name: '00_REVISION_GENERAL.png', data: sheet },
        { name: 'manifest.json', data: encoder.encode(JSON.stringify(manifest, null, 2)) },
        { name: 'LEEME.txt', data: encoder.encode(readme) },
        ...actualApproved.map((job) => ({
          name: `${job.category}/${safeFileName(job.id, blobs[job.id])}`,
          data: blobs[job.id],
        })),
      ];
      const zip = await createStoredZip(entries);
      await downloadBlob(zip, 'Lumo_OpenArt_Canonical_Pack_Approved_v2.zip');
      commit((current) => ({ ...current, message: `ZIP descargado con ${actualApproved.length} referencias aprobadas.` }));
    } catch (error) {
      commit((current) => ({ ...current, message: error instanceof Error ? error.message : 'No se pudo crear el ZIP.' }));
    } finally {
      setExporting(false);
    }
  }, [approved, canExport, commit, excluded, missing, pending, state]);

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.13),transparent_35%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-200/70">Canon Review Guard · v5 · ZIP directo</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Revisión final para OpenArt</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">Descarga solo las referencias aprobadas disponibles. Las retiradas, pendientes y ausentes quedan documentadas en el manifiesto, pero ya no bloquean la exportación.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value={approved.length} label="listas para ZIP" accent="text-emerald-200" />
              <Metric value={excluded.length} label="retiradas" accent="text-orange-200" />
              <Metric value={pending.length} label="por revisar" />
              <Metric value={money(state.spent)} label="gasto anterior" accent="text-amber-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-5">
              <h2 className="font-black text-emerald-100">Descarga desbloqueada</h2>
              <p className="mt-2 text-xs leading-5 text-emerald-50/50">El ZIP incluye únicamente las imágenes aprobadas que existen en tu navegador. No requiere resolver las 25 ni abre el selector de carpetas.</p>
              <button type="button" disabled={!canExport} onClick={exportZip} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-30">
                {exporting ? 'Creando ZIP…' : `Descargar ZIP con ${approved.length} aprobadas`}
              </button>
              {!approved.length && <p className="mt-3 text-[11px] text-white/35">Aprueba al menos una referencia con archivo local para activar la descarga.</p>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Contenido actual</h2>
              <div className="mt-4 space-y-2 text-xs text-white/45">
                <div className="flex justify-between"><span>Aprobadas disponibles</span><strong className="text-emerald-100">{approved.length}</strong></div>
                <div className="flex justify-between"><span>Retiradas</span><strong className="text-orange-100">{excluded.length}</strong></div>
                <div className="flex justify-between"><span>Pendientes</span><strong>{pending.length}</strong></div>
                <div className="flex justify-between"><span>Ausentes</span><strong>{missing.length}</strong></div>
                <div className="flex justify-between"><span>Coste de esta descarga</span><strong className="text-emerald-100">$0.0000</strong></div>
              </div>
            </section>

            <section className="rounded-3xl border border-orange-300/15 bg-orange-300/[.035] p-5 text-xs leading-5 text-orange-50/50">
              <strong className="text-orange-100">No se regenerará nada:</strong> las cuatro referencias incoherentes permanecen retiradas y fuera del ZIP.
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] px-5 py-4 text-sm text-cyan-50/65">
              {hydrated ? state.message : 'Recuperando imágenes y decisiones locales…'}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wider ${category === item ? 'bg-white text-black' : 'border border-white/10 text-white/40'}`}>{item === 'all' ? 'todas' : item}</button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visible.map((job) => {
                const item = state.jobs[job.id] || EMPTY;
                const [label, style] = badge(item);
                return (
                  <article key={job.id} className={`overflow-hidden rounded-3xl border bg-[#0c0e13] ${item.excluded ? 'border-orange-300/20' : 'border-white/10'}`}>
                    <div className="relative aspect-[4/3] bg-black/35">
                      <img src={previews[job.id] || job.source} alt={job.id} className={`h-full w-full object-contain ${previews[job.id] ? '' : 'opacity-45'}`} />
                      <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${style}`}>{label}</span>
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-black text-white/85">{job.id}</p>
                      <p className="mt-1 text-[11px] text-white/35">{job.category} · {job.view}</p>
                      {WARNINGS[job.id] && <p className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[.04] p-3 text-[11px] leading-5 text-amber-50/55">{WARNINGS[job.id]}</p>}
                      {item.exclusionReason && <p className="mt-3 rounded-xl border border-orange-300/10 bg-orange-300/[.04] p-3 text-[11px] leading-5 text-orange-50/55">{item.exclusionReason}</p>}
                      {item.blobStored && !item.excluded && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => approve(job.id)} className={`rounded-xl px-3 py-2.5 text-xs font-black ${item.approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-300/20 text-emerald-100'}`}>Aprobar</button>
                          <button type="button" onClick={() => exclude(job.id)} className="rounded-xl border border-orange-300/20 px-3 py-2.5 text-xs font-black text-orange-100">Retirar</button>
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
