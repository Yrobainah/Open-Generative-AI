'use client';

import { useMemo, useState } from 'react';
import storyboard from '../content/season-01/storyboards/S01E01.storyboard.json';

const PHASES = [
  { id: 'hook', label: 'Gancho', start: 0, end: 75, className: 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100' },
  { id: 'attempts', label: 'Intentos', start: 75, end: 155, className: 'border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100' },
  { id: 'song', label: 'Canción', start: 155, end: 237, className: 'border-violet-300/20 bg-violet-300/[0.07] text-violet-100' },
  { id: 'resolution', label: 'Resolución', start: 237, end: 292, className: 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100' },
  { id: 'close', label: 'Cierre', start: 292, end: 310, className: 'border-blue-300/20 bg-blue-300/[0.07] text-blue-100' },
];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function getPhase(scene) {
  return PHASES.find((phase) => scene.startSecond >= phase.start && scene.startSecond < phase.end) || PHASES[0];
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

export default function LumoStoryboardStudio({ onBack, onOpenStudio }) {
  const [selectedId, setSelectedId] = useState(storyboard.scenes[0].id);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => storyboard.scenes.find((scene) => scene.id === selectedId) || storyboard.scenes[0],
    [selectedId],
  );

  const selectedPhase = getPhase(selected);
  const duration = selected.endSecond - selected.startSecond;
  const totalDialogueLines = storyboard.scenes.reduce((total, scene) => total + scene.dialogue.length, 0);
  const totalAssets = Object.values(storyboard.assetRegistry).reduce((total, group) => total + group.length, 0);

  const copyScene = async () => {
    const payload = {
      episodeCode: storyboard.episodeCode,
      storyboardId: storyboard.id,
      scene: selected,
      characterReferences: storyboard.characterReferences,
      visualStyle: storyboard.visualStyle,
      aspectRatio: storyboard.aspectRatio,
      frameRate: storyboard.frameRate,
    };
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openStudio = (studioId) => {
    const payload = {
      source: 'lumo-storyboard',
      createdAt: new Date().toISOString(),
      targetStudio: studioId,
      episodeCode: storyboard.episodeCode,
      storyboardId: storyboard.id,
      scene: selected,
      characterReferences: storyboard.characterReferences,
      visualStyle: storyboard.visualStyle,
      aspectRatio: storyboard.aspectRatio,
      frameRate: storyboard.frameRate,
      approvalRequired: true,
    };
    window.sessionStorage.setItem('lumo_storyboard_handoff_v1', JSON.stringify(payload));
    if (typeof onOpenStudio === 'function') onOpenStudio(studioId);
  };

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px]">
        <header className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.14),transparent_30%),#0b0c10] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Guion técnico · Storyboard v{storyboard.version}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{storyboard.title}</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Plan completo de producción del piloto. Cada escena fija tiempo, actuación, cámara, sonido, continuidad y recursos antes de generar imágenes o vídeo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat value={storyboard.scenes.length} label="Escenas" />
              <Stat value={formatTime(storyboard.targetDurationSeconds)} label="Duración" />
              <Stat value={totalDialogueLines} label="Intervenciones" />
              <Stat value={totalAssets} label="Recursos" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PHASES.map((phase) => (
              <span key={phase.id} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${phase.className}`}>
                {formatTime(phase.start)}–{formatTime(phase.end)} · {phase.label}
              </span>
            ))}
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black">Línea temporal</h2>
              <p className="mt-1 text-xs text-white/35">Selecciona una escena para revisar su ficha de producción.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold text-white/40">
              0:00–5:10 sin huecos
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9">
            {storyboard.scenes.map((scene) => {
              const active = scene.id === selected.id;
              const phase = getPhase(scene);
              return (
                <button
                  type="button"
                  key={scene.id}
                  onClick={() => setSelectedId(scene.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    active ? 'border-cyan-300/35 bg-cyan-300/[0.11] shadow-lg shadow-cyan-950/20' : 'border-white/[0.06] bg-white/[0.018] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-black ${active ? 'text-cyan-100' : 'text-white/65'}`}>{scene.id}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${phase.className.split(' ')[1]}`} />
                  </span>
                  <span className="mt-1 block text-[10px] text-white/35">{formatTime(scene.startSecond)}–{formatTime(scene.endSecond)}</span>
                  <span className={`mt-1 block truncate text-[11px] font-bold ${active ? 'text-white' : 'text-white/55'}`}>{scene.title}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3 xl:sticky xl:top-5 xl:h-[calc(100vh-40px)] xl:overflow-y-auto">
            <div className="px-2 pb-3 pt-1">
              <h2 className="text-sm font-black">Escenas</h2>
              <p className="mt-1 text-xs text-white/35">Guion ordenado de principio a fin.</p>
            </div>
            <div className="space-y-1.5">
              {storyboard.scenes.map((scene) => {
                const active = scene.id === selected.id;
                const phase = getPhase(scene);
                return (
                  <button
                    type="button"
                    key={scene.id}
                    onClick={() => setSelectedId(scene.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      active ? 'border-cyan-300/25 bg-cyan-300/[0.08]' : 'border-transparent bg-white/[0.015] hover:border-white/[0.07] hover:bg-white/[0.035]'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black ${active ? 'text-cyan-100' : 'text-white/65'}`}>{scene.id}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${phase.className}`}>{phase.label}</span>
                    </span>
                    <span className="mt-1.5 block text-[12px] font-bold text-white/75">{scene.title}</span>
                    <span className="mt-1 block text-[10px] text-white/30">{formatTime(scene.startSecond)}–{formatTime(scene.endSecond)} · {scene.endSecond - scene.startSecond}s</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/75">{selected.id}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${selectedPhase.className}`}>{selectedPhase.label}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-white/40">
                      {formatTime(selected.startSecond)}–{formatTime(selected.endSecond)} · {duration}s
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{selected.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/55">{selected.purpose}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyScene} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08]">
                    {copied ? 'Escena copiada ✓' : 'Copiar escena'}
                  </button>
                  <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08]">
                    ← Volver
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Lugar</p>
                  <p className="mt-1.5 text-sm font-bold text-white/75">{selected.location}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Emoción</p>
                  <p className="mt-1.5 text-sm font-bold text-white/75">{selected.emotionalBeat}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Plano</p>
                  <p className="mt-1.5 text-sm font-bold text-white/75">{selected.shot.size}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Personajes</p>
                  <p className="mt-1.5 text-sm font-bold text-white/75">{selected.characters.join(', ')}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Acción y composición</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{selected.action}</p>
                <dl className="mt-5 space-y-3 text-xs">
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="font-bold text-white/30">Ángulo y composición</dt>
                    <dd className="mt-1.5 leading-5 text-white/60">{selected.shot.angle} · {selected.shot.composition}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="font-bold text-white/30">Cámara</dt>
                    <dd className="mt-1.5 leading-5 text-white/60">{selected.camera.movement}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="font-bold text-white/30">Entrada y salida</dt>
                    <dd className="mt-1.5 leading-5 text-white/60">{selected.camera.transitionIn} → {selected.camera.transitionOut}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="font-bold text-white/30">Iluminación</dt>
                    <dd className="mt-1.5 leading-5 text-white/60">{selected.lighting}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Diálogo y actuación</h3>
                <div className="mt-4 space-y-3">
                  {selected.dialogue.map((line, index) => (
                    <div key={`${line.speaker}-${index}`} className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-black text-violet-100">{line.speaker}</span>
                        <span className="text-[10px] text-white/30">{line.direction}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/75">“{line.text}”</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Audio y continuidad</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/[0.025] p-3 text-xs">
                    <p className="font-bold text-white/30">Música</p>
                    <p className="mt-1.5 leading-5 text-white/60">{selected.audio.music}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3 text-xs">
                    <p className="font-bold text-white/30">Ambiente</p>
                    <p className="mt-1.5 leading-5 text-white/60">{selected.audio.ambience}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3 text-xs sm:col-span-2">
                    <p className="font-bold text-white/30">Efectos</p>
                    <p className="mt-1.5 leading-5 text-white/60">{selected.audio.sfx.join(', ')}</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3 text-xs sm:col-span-2">
                    <p className="font-bold text-white/30">Continuidad</p>
                    <p className="mt-1.5 leading-5 text-white/60">{selected.continuity}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Recursos necesarios</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.assets.map((asset) => (
                    <span key={asset} className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.045] px-2.5 py-1.5 font-mono text-[10px] text-cyan-100/65">{asset}</span>
                  ))}
                </div>
                <h3 className="mt-6 text-sm font-black">Dispositivo de retención</h3>
                <p className="mt-3 text-xs leading-5 text-white/50">{selected.retentionDevice}</p>
              </section>
            </div>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <h3 className="text-sm font-black">Prompt de plano</h3>
              <p className="mt-1 text-xs text-white/35">Base visual específica para producir esta escena manteniendo el estilo y las hojas maestras.</p>
              <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 font-mono text-xs leading-6 text-cyan-50/70">{selected.generationPrompt}</div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button type="button" onClick={() => openStudio('workflows')} className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.055] p-4 text-left transition hover:bg-violet-300/[0.1]">
                  <span className="block text-sm font-black text-violet-100">Enviar a Workflows</span>
                  <span className="mt-1 block text-xs leading-5 text-white/40">Orquestar recursos y tareas de la escena.</span>
                </button>
                <button type="button" onClick={() => openStudio('image')} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 text-left transition hover:bg-cyan-300/[0.1]">
                  <span className="block text-sm font-black text-cyan-100">Crear keyframe</span>
                  <span className="mt-1 block text-xs leading-5 text-white/40">Generar composición y personajes.</span>
                </button>
                <button type="button" onClick={() => openStudio('audio')} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-4 text-left transition hover:bg-amber-300/[0.1]">
                  <span className="block text-sm font-black text-amber-100">Preparar audio</span>
                  <span className="mt-1 block text-xs leading-5 text-white/40">Diálogo, música, ambiente y efectos.</span>
                </button>
                <button type="button" onClick={() => openStudio('video')} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.055] p-4 text-left transition hover:bg-emerald-300/[0.1]">
                  <span className="block text-sm font-black text-emerald-100">Animar escena</span>
                  <span className="mt-1 block text-xs leading-5 text-white/40">Enviar cámara, acción y duración.</span>
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[0.045] p-5 text-sm leading-6 text-amber-50/70">
              Este storyboard continúa en estado <strong className="text-amber-100">borrador</strong>. Ningún plano generado se considera definitivo hasta comprobar actuación, continuidad, legibilidad infantil y coherencia con las hojas de modelo.
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
