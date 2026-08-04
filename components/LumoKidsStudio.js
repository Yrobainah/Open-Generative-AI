'use client';

import { useMemo, useState } from 'react';
import season from '../content/season-01/season.json';
import pilot from '../content/season-01/episodes/S01E01.json';

const EPISODE_DETAILS = {
  [pilot.code]: pilot,
};

const PIPELINE = [
  { id: 'idea', label: 'Idea y enseñanza' },
  { id: 'script', label: 'Guion' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'art', label: 'Arte y personajes' },
  { id: 'audio', label: 'Voces y audio' },
  { id: 'animation', label: 'Animación y montaje' },
  { id: 'review', label: 'Revisión humana' },
  { id: 'publish', label: 'Publicación' },
];

const QUICK_ACTIONS = [
  {
    id: 'workflows',
    title: 'Construir el flujo',
    description: 'Orquesta guion, imágenes, voz y montaje.',
    accent: 'from-violet-500/20 to-fuchsia-500/5',
  },
  {
    id: 'image',
    title: 'Diseñar escenas',
    description: 'Genera personajes, fondos y referencias visuales.',
    accent: 'from-cyan-500/20 to-sky-500/5',
  },
  {
    id: 'audio',
    title: 'Crear voces',
    description: 'Prepara narración, diálogos y música original.',
    accent: 'from-amber-500/20 to-orange-500/5',
  },
  {
    id: 'video',
    title: 'Animar el capítulo',
    description: 'Convierte las escenas aprobadas en clips.',
    accent: 'from-emerald-500/20 to-teal-500/5',
  },
];

const STATUS_STYLES = {
  idea: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  script: 'border-violet-400/25 bg-violet-400/10 text-violet-200',
  production: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200',
  review: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
  published: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
};

const STATUS_LABELS = {
  idea: 'Idea',
  script: 'Guion',
  production: 'Producción',
  review: 'Revisión',
  published: 'Publicado',
};

function LightIcon({ className = '' }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.5 14.5A6 6 0 1 1 15.5 14.5C14.6 15.2 14 16.1 14 17h-4c0-.9-.6-1.8-1.5-2.5Z" />
      <path d="M12 2V1" />
      <path d="m4.2 4.2-.7-.7" />
      <path d="m19.8 4.2.7-.7" />
    </svg>
  );
}

export default function LumoKidsStudio({ onOpenStudio }) {
  const [selectedCode, setSelectedCode] = useState(season.episodes[0].code);

  const selectedEpisode = useMemo(() => {
    const summary = season.episodes.find((episode) => episode.code === selectedCode);
    const details = EPISODE_DETAILS[selectedCode];

    return {
      ...summary,
      status: details?.status || 'idea',
      durationMinutes: details?.durationMinutes || 8,
      logline: details?.logline || 'La ficha narrativa de este capítulo se preparará después de aprobar el episodio piloto.',
      focusCharacters: details?.focusCharacters || [],
      storyBeats: details?.storyBeats || [],
      humanApproved: details?.publication?.humanApproved || false,
      hasDetailedManifest: Boolean(details),
    };
  }, [selectedCode]);

  const completedStages = selectedEpisode.hasDetailedManifest ? 1 : 0;
  const progress = Math.round((completedStages / PIPELINE.length) * 100);

  const openStudio = (studioId) => {
    if (typeof onOpenStudio === 'function') {
      onOpenStudio(studioId);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#06070a] text-white">
      <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.14),transparent_30%),#0b0c10] p-6 shadow-2xl shadow-black/25 sm:p-8">
          <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full border border-cyan-300/10" />
          <div className="absolute -right-4 -top-8 h-32 w-32 rounded-full border border-violet-300/10" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                <LightIcon className="h-4 w-4" />
                Producción infantil original
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Lumo Kids Studio
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-[15px]">
                Centro de producción de <span className="font-semibold text-white/85">{season.series}</span>. Aquí organizamos la historia, el arte, las voces, la animación y la revisión humana de cada capítulo.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[11px] font-black text-amber-100">
                Canon v4 bloqueado · 20,67 USD confirmados · reserva 4,23 USD
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center">
                <div className="text-xl font-black text-white">{season.episodes.length}</div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">Capítulos</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center">
                <div className="text-xl font-black text-white">{season.audience}</div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">Edad</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/25 px-4 py-3 text-center">
                <div className="text-xl font-black text-white">1</div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">En marcha</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#07111c]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Fuente visual de verdad</p>
              <h2 className="mt-1 text-sm font-black">Character Design canónico v4</h2>
            </div>
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-100">APROBADO</span>
          </div>
          <img src="/lumo-kids/canon/Character-Design-v4.png" alt="Character Design canónico de Lumo Kids" className="h-auto w-full" />
        </section>

        <div className="mt-5 grid flex-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <div>
                <p className="text-sm font-bold text-white">Temporada {season.season}</p>
                <p className="mt-0.5 text-xs text-white/35">{season.workingTitle}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/45">
                {season.format}
              </span>
            </div>

            <div className="space-y-1.5">
              {season.episodes.map((episode, index) => {
                const selected = episode.code === selectedCode;
                const hasManifest = Boolean(EPISODE_DETAILS[episode.code]);

                return (
                  <button
                    type="button"
                    key={episode.code}
                    onClick={() => setSelectedCode(episode.code)}
                    className={`group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-cyan-300/20 bg-cyan-300/[0.08] shadow-lg shadow-cyan-950/10'
                        : 'border-transparent bg-white/[0.015] hover:border-white/[0.07] hover:bg-white/[0.035]'
                    }`}
                    aria-pressed={selected}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                      selected ? 'bg-cyan-300 text-slate-950' : 'bg-white/[0.05] text-white/45 group-hover:text-white/70'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-bold ${selected ? 'text-white' : 'text-white/70'}`}>
                        {episode.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-white/35">
                        <span>{episode.lesson}</span>
                        {hasManifest && <span className="h-1 w-1 rounded-full bg-cyan-300" />}
                        {hasManifest && <span className="text-cyan-200/70">Ficha creada</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200/75">
                      {selectedEpisode.code}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[selectedEpisode.status] || STATUS_STYLES.idea}`}>
                      {STATUS_LABELS[selectedEpisode.status] || selectedEpisode.status}
                    </span>
                    {!selectedEpisode.humanApproved && (
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Pendiente de aprobación
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {selectedEpisode.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    {selectedEpisode.logline}
                  </p>
                </div>

                <div className="grid min-w-[240px] grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Enseñanza</p>
                    <p className="mt-1 text-sm font-bold text-white/80">{selectedEpisode.lesson}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">Duración</p>
                    <p className="mt-1 text-sm font-bold text-white/80">{selectedEpisode.durationMinutes} min</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-white/55">Progreso del capítulo</span>
                  <span className="font-black text-cyan-200">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {PIPELINE.map((stage, index) => {
                    const complete = index < completedStages;
                    const current = index === completedStages;

                    return (
                      <div
                        key={stage.id}
                        className={`rounded-xl border px-3 py-2.5 ${
                          complete
                            ? 'border-emerald-400/20 bg-emerald-400/[0.07]'
                            : current
                              ? 'border-cyan-300/25 bg-cyan-300/[0.07]'
                              : 'border-white/[0.055] bg-white/[0.015]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                            complete
                              ? 'bg-emerald-300 text-emerald-950'
                              : current
                                ? 'bg-cyan-300 text-cyan-950'
                                : 'bg-white/[0.06] text-white/30'
                          }`}>
                            {complete ? '✓' : index + 1}
                          </span>
                          <span className={`text-[11px] font-bold ${current ? 'text-cyan-100' : complete ? 'text-emerald-100' : 'text-white/40'}`}>
                            {stage.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-white">Estructura narrativa</h3>
                    <p className="mt-1 text-xs text-white/35">Los momentos principales que sostienen el capítulo.</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/35">
                    {selectedEpisode.storyBeats.length} momentos
                  </span>
                </div>

                {selectedEpisode.storyBeats.length > 0 ? (
                  <ol className="mt-5 space-y-3">
                    {selectedEpisode.storyBeats.map((beat, index) => (
                      <li key={`${selectedEpisode.code}-${index}`} className="flex gap-3 text-sm leading-5 text-white/58">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] text-[10px] font-black text-cyan-200">
                          {index + 1}
                        </span>
                        <span className="pt-0.5">{beat}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-6 text-center">
                    <LightIcon className="mx-auto h-8 w-8 text-white/20" />
                    <p className="mt-3 text-sm font-bold text-white/55">Ficha narrativa pendiente</p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/30">
                      Terminaremos primero el episodio piloto y usaremos lo aprendido para desarrollar este capítulo.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
                <h3 className="text-base font-black text-white">Herramientas de producción</h3>
                <p className="mt-1 text-xs text-white/35">Abre el módulo adecuado sin perder el capítulo seleccionado.</p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() => openStudio(action.id)}
                      className={`group rounded-2xl border border-white/[0.07] bg-gradient-to-br ${action.accent} p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/15`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white/85 group-hover:text-white">{action.title}</p>
                          <p className="mt-1 text-[11px] leading-4 text-white/38">{action.description}</p>
                        </div>
                        <span className="text-lg text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60">→</span>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedEpisode.focusCharacters.length > 0 && (
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/28">Personajes del capítulo</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedEpisode.focusCharacters.map((character) => (
                        <span key={character} className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-white/55">
                          {character}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
