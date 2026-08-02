'use client';

import { useEffect, useMemo, useState } from 'react';
import proof from '../content/season-01/proofs/S01E01-theft-proof.json';

const RESULT_KEY = 'lumo_ogai_proof_results_v1';
const HANDOFF_KEY = 'lumo_ogai_proof_handoff_v1';

function formatSeconds(seconds) {
  return `${seconds}s`;
}

function emptyResults() {
  return {
    startFrames: {},
    videos: {},
    audio: {},
    lipSync: {},
    assembledPreview: '',
  };
}

function StatusPill({ complete, children }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
      complete
        ? 'border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100'
        : 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100/70'
    }`}>
      {children}
    </span>
  );
}

function ResultField({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</span>
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-cyan-300/35"
      />
    </label>
  );
}

export default function LumoOgaiProofStudio({ onBack, onOpenStudio }) {
  const [selectedId, setSelectedId] = useState(proof.shots[0].id);
  const [results, setResults] = useState(emptyResults);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RESULT_KEY) || 'null');
      if (stored) setResults({ ...emptyResults(), ...stored });
    } catch {
      setResults(emptyResults());
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(RESULT_KEY, JSON.stringify(results));
    } catch {
      // Local persistence is optional.
    }
  }, [results]);

  const selected = useMemo(
    () => proof.shots.find((shot) => shot.id === selectedId) || proof.shots[0],
    [selectedId],
  );

  const completedShots = proof.shots.filter((shot) => {
    const video = results.lipSync?.[shot.id] || results.videos?.[shot.id];
    const hasFrame = Boolean(results.startFrames?.[shot.id]);
    const hasAudio = shot.dialogue.length === 0 || Boolean(results.audio?.[shot.id]);
    const hasLipSync = !proof.completionRules.requiresLipSyncForShots.includes(shot.id) || Boolean(results.lipSync?.[shot.id]);
    return hasFrame && Boolean(video) && hasAudio && hasLipSync;
  }).length;

  const proofComplete = completedShots === proof.shots.length && Boolean(results.assembledPreview);

  const updateResult = (group, shotId, value) => {
    setResults((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [shotId]: value,
      },
    }));
  };

  const prepareStudio = async (studioId, shot) => {
    const studioMap = {
      image: proof.studios.image,
      video: proof.studios.video,
      audio: proof.studios.audio,
      lipsync: proof.studios.lipSync,
    };
    const studio = studioMap[studioId];
    const prompt = studioId === 'image'
      ? shot.imagePrompt
      : studioId === 'video'
        ? shot.videoPrompt
        : studioId === 'audio'
          ? shot.dialogue.map((line) => `${line.speaker}: ${line.text} (${line.direction})`).join('\n')
          : shot.videoPrompt;

    const payload = {
      source: 'lumo-ogai-proof',
      createdAt: new Date().toISOString(),
      proofId: proof.id,
      episodeCode: proof.episodeCode,
      shot,
      targetStudio: studioId,
      recommendedModelId: studio.recommendedModelId,
      recommendedModelName: studio.recommendedModelName,
      prompt,
      globalVisualPrompt: proof.globalVisualPrompt,
      globalNegativePrompt: proof.globalNegativePrompt,
      referenceRequirements: proof.referenceRequirements,
      currentResults: {
        startFrame: results.startFrames?.[shot.id] || null,
        video: results.videos?.[shot.id] || null,
        audio: results.audio?.[shot.id] || null,
        lipSync: results.lipSync?.[shot.id] || null,
      },
      productionPlatform: proof.productionPlatform,
      externalRenderingAllowed: false,
      humanReviewRequired: true,
    };

    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    await navigator.clipboard?.writeText(prompt);
    setCopied(studioId);
    window.setTimeout(() => setCopied(''), 1800);
    onOpenStudio?.(studioId);
  };

  const copyManifest = async () => {
    await navigator.clipboard?.writeText(JSON.stringify({ proof, results }, null, 2));
    setCopied('manifest');
    window.setTimeout(() => setCopied(''), 1800);
  };

  const finalVideo = results.lipSync?.[selected.id] || results.videos?.[selected.id];

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(168,85,247,0.16),transparent_32%),#0b0c10] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Prueba real · Open-Generative-AI</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{proof.title}</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Tres planos generados en los estudios reales del proyecto. La prueba no puede marcarse como terminada hasta registrar fotogramas, vídeos, voces, sincronización y montaje producidos por Open-Generative-AI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill complete={completedShots === proof.shots.length}>{completedShots}/{proof.shots.length} planos</StatusPill>
              <StatusPill complete={Boolean(results.assembledPreview)}>montaje final</StatusPill>
              <StatusPill complete={proofComplete}>{proofComplete ? 'lista para revisar' : 'en producción'}</StatusPill>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {Object.entries(proof.studios).map(([key, studio]) => (
              <div key={key} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/30">{key}</p>
                <p className="mt-2 text-sm font-black text-white/80">{studio.recommendedModelName}</p>
                <p className="mt-1 text-xs leading-5 text-white/40">{studio.purpose}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3 xl:sticky xl:top-5 xl:h-fit">
            <div className="px-2 pb-3 pt-1">
              <h2 className="text-sm font-black">Planos de la prueba</h2>
              <p className="mt-1 text-xs text-white/35">Duración total: {proof.targetDurationSeconds} segundos.</p>
            </div>
            <div className="space-y-2">
              {proof.shots.map((shot) => {
                const active = shot.id === selected.id;
                const complete = completedShots > 0 && Boolean(results.startFrames?.[shot.id]) && Boolean(results.lipSync?.[shot.id] || results.videos?.[shot.id]);
                return (
                  <button
                    key={shot.id}
                    type="button"
                    onClick={() => setSelectedId(shot.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${active ? 'border-cyan-300/30 bg-cyan-300/[0.08]' : 'border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04]'}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-cyan-100">{shot.id}</span>
                      <StatusPill complete={complete}>{complete ? 'generado' : formatSeconds(shot.durationSeconds)}</StatusPill>
                    </span>
                    <span className="mt-2 block text-sm font-black text-white/80">{shot.title}</span>
                    <span className="mt-1 block text-[11px] text-white/35">{shot.characters.join(', ')}</span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={onBack} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black text-white/60 hover:bg-white/[0.06]">
              ← Volver al paquete
            </button>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/70">{selected.id} · {selected.durationSeconds} segundos</p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{selected.title}</h2>
                  <p className="mt-2 text-sm text-white/45">Personajes: {selected.characters.join(', ')}</p>
                </div>
                <button type="button" onClick={copyManifest} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black text-white/65 hover:bg-white/[0.07]">
                  {copied === 'manifest' ? 'Paquete copiado ✓' : 'Copiar paquete técnico'}
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button type="button" onClick={() => prepareStudio('image', selected)} className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-left transition hover:bg-amber-300/[0.1]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/55">Paso 1</span>
                  <span className="mt-1 block text-sm font-black text-amber-50">Image Studio</span>
                  <span className="mt-2 block text-xs text-amber-50/45">{copied === 'image' ? 'Prompt copiado ✓' : 'Generar fotograma inicial'}</span>
                </button>
                <button type="button" onClick={() => prepareStudio('video', selected)} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 text-left transition hover:bg-cyan-300/[0.1]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-100/55">Paso 2</span>
                  <span className="mt-1 block text-sm font-black text-cyan-50">Video Studio</span>
                  <span className="mt-2 block text-xs text-cyan-50/45">{copied === 'video' ? 'Prompt copiado ✓' : 'Animar el fotograma'}</span>
                </button>
                <button type="button" disabled={selected.dialogue.length === 0} onClick={() => prepareStudio('audio', selected)} className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4 text-left transition enabled:hover:bg-violet-300/[0.1] disabled:cursor-not-allowed disabled:opacity-35">
                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-100/55">Paso 3</span>
                  <span className="mt-1 block text-sm font-black text-violet-50">Audio Studio</span>
                  <span className="mt-2 block text-xs text-violet-50/45">{selected.dialogue.length ? 'Generar voces expresivas' : 'Sin diálogo visible'}</span>
                </button>
                <button type="button" disabled={!proof.completionRules.requiresLipSyncForShots.includes(selected.id)} onClick={() => prepareStudio('lipsync', selected)} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4 text-left transition enabled:hover:bg-fuchsia-300/[0.1] disabled:cursor-not-allowed disabled:opacity-35">
                  <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-100/55">Paso 4</span>
                  <span className="mt-1 block text-sm font-black text-fuchsia-50">Lip Sync</span>
                  <span className="mt-2 block text-xs text-fuchsia-50/45">Solo para primer plano hablado</span>
                </button>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Prompt del fotograma</h3>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-amber-300/10 bg-amber-300/[0.03] p-4 text-xs leading-6 text-amber-50/65">{selected.imagePrompt}</p>
              </section>
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Prompt de animación</h3>
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.03] p-4 text-xs leading-6 text-cyan-50/65">{selected.videoPrompt}</p>
              </section>
            </div>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <h3 className="text-sm font-black">Diálogo y sonido</h3>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="space-y-3">
                  {selected.dialogue.length ? selected.dialogue.map((line, index) => (
                    <div key={`${line.speaker}-${index}`} className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.035] p-4">
                      <p className="text-xs font-black text-violet-100">{line.speaker}</p>
                      <p className="mt-2 text-sm leading-6 text-white/70">“{line.text}”</p>
                      <p className="mt-2 text-xs italic text-white/35">{line.direction}</p>
                    </div>
                  )) : <p className="text-sm text-white/35">Este plano se apoya en música, ambiente y actuación corporal.</p>}
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-6 text-white/50">
                  <p><strong className="text-white/75">Música:</strong> {selected.audioPlan.music}</p>
                  <p className="mt-2"><strong className="text-white/75">Ambiente:</strong> {selected.audioPlan.ambience}</p>
                  <p className="mt-2"><strong className="text-white/75">Efectos:</strong> {selected.audioPlan.sfx.join(', ')}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black">Registro de resultados reales</h3>
                  <p className="mt-1 text-xs text-white/35">Pega las URL que entrega Open-Generative-AI. Sin estas URL el plano seguirá pendiente.</p>
                </div>
                <StatusPill complete={Boolean(finalVideo)}>{finalVideo ? 'vídeo registrado' : 'pendiente'}</StatusPill>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ResultField label="Fotograma inicial" value={results.startFrames?.[selected.id]} placeholder="URL generada por Image Studio" onChange={(value) => updateResult('startFrames', selected.id, value)} />
                <ResultField label="Vídeo I2V" value={results.videos?.[selected.id]} placeholder="URL generada por Video Studio" onChange={(value) => updateResult('videos', selected.id, value)} />
                <ResultField label="Audio de diálogo" value={results.audio?.[selected.id]} placeholder="URL generada por Audio Studio" onChange={(value) => updateResult('audio', selected.id, value)} />
                <ResultField label="Vídeo con lip sync" value={results.lipSync?.[selected.id]} placeholder="URL generada por Lip Sync Studio" onChange={(value) => updateResult('lipSync', selected.id, value)} />
              </div>
              {finalVideo && (
                <video className="mt-5 aspect-video w-full rounded-2xl border border-white/10 bg-black" src={finalVideo} controls playsInline />
              )}
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <h3 className="text-sm font-black">Criterios de aprobación</h3>
                  <ul className="mt-4 space-y-2">
                    {selected.approvalCriteria.map((criterion) => (
                      <li key={criterion} className="flex gap-3 text-xs leading-5 text-white/50">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <ResultField label="Montaje completo de 25 segundos" value={results.assembledPreview} placeholder="URL del montaje final" onChange={(value) => setResults((current) => ({ ...current, assembledPreview: value }))} />
                  {results.assembledPreview && <video className="mt-4 aspect-video w-full rounded-xl border border-white/10 bg-black" src={results.assembledPreview} controls playsInline />}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
