'use client';

import { useMemo, useState } from 'react';
import episode from '../content/season-01/episodes/S01E01.json';
import launchPackage from '../content/season-01/packages/S01E01.launch.json';

const STATUS_LABELS = {
  strategy: 'Estrategia',
  production: 'Producción',
  review: 'Revisión',
  approved: 'Aprobado',
};

function StatCard({ label, value, suffix = '' }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">
        {value}{suffix}
      </p>
    </div>
  );
}

function Section({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6 ${className}`}>
      <div>
        <h2 className="text-base font-black text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-white/35">{description}</p>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CopyButton({ value, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-white/60 transition hover:bg-white/[0.08] hover:text-white"
    >
      {copied ? 'Copiado ✓' : label}
    </button>
  );
}

export default function LumoEpisodeLaunchPackage({ onBack, onOpenStudio }) {
  const [selectedTitle, setSelectedTitle] = useState(launchPackage.searchTitle);

  const packageJson = useMemo(
    () => JSON.stringify({ ...launchPackage, selectedTitle }, null, 2),
    [selectedTitle],
  );

  const prepareStudio = (studioId, payload) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        'lumo_episode_launch_handoff_v1',
        JSON.stringify({
          episodeCode: episode.code,
          title: selectedTitle,
          launchPackageId: launchPackage.id,
          targetStudio: studioId,
          payload,
        }),
      );
    }

    if (typeof onOpenStudio === 'function') onOpenStudio(studioId);
  };

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1580px]">
        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_10%_10%,rgba(250,204,21,0.15),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(34,211,238,0.14),transparent_28%),#0b0c10] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                  {episode.code}
                </span>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                  {STATUS_LABELS[launchPackage.status] || launchPackage.status}
                </span>
                {!launchPackage.approval.humanApproved && (
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                    Pendiente de aprobación humana
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Paquete de lanzamiento</h1>
              <p className="mt-2 text-lg font-bold text-white/80">{episode.title}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                Una historia se convierte en episodio, canción, tres Shorts y material reutilizable para compilaciones sin alterar su enseñanza central.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/65 transition hover:bg-white/[0.08] hover:text-white"
              >
                ← Volver al estudio
              </button>
              <CopyButton value={packageJson} label="Copiar paquete JSON" />
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Episodio" value={launchPackage.mainVideo.targetDurationSeconds} suffix=" s" />
            <StatCard label="Canción" value={launchPackage.song.durationSeconds} suffix=" s" />
            <StatCard label="Shorts" value={launchPackage.shorts.length} />
            <StatCard label="Piezas previstas" value={5} />
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <Section
              title="Título público y descubrimiento"
              description="El título artístico se conserva dentro del vídeo. El título público explica primero el aprendizaje."
            >
              <div className="space-y-2">
                {[launchPackage.searchTitle, ...launchPackage.alternateTitles].map((title) => {
                  const active = title === selectedTitle;
                  return (
                    <button
                      type="button"
                      key={title}
                      onClick={() => setSelectedTitle(title)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-cyan-300/25 bg-cyan-300/[0.07]'
                          : 'border-white/[0.055] bg-white/[0.015] hover:bg-white/[0.035]'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                        active ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/20 text-transparent'
                      }`}>
                        ✓
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-bold leading-5 text-white/75">{title}</span>
                      <span className="text-[10px] font-bold text-white/25">{title.length}/100</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section
              title="Línea temporal del episodio"
              description="La historia comienza con el problema; la identidad de la serie aparece mientras la acción ya está en marcha."
            >
              <div className="space-y-3">
                {launchPackage.mainVideo.segments.map((segment, index) => {
                  const duration = segment.endSecond - segment.startSecond;
                  const width = Math.max(12, (duration / launchPackage.mainVideo.targetDurationSeconds) * 100);
                  return (
                    <div key={`${segment.startSecond}-${segment.endSecond}`} className="rounded-2xl border border-white/[0.055] bg-white/[0.018] p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-white/80">{index + 1}. {segment.purpose}</p>
                          <p className="mt-1 text-xs text-white/35">{segment.retentionDevice}</p>
                        </div>
                        <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/45">
                          {segment.startSecond}s–{segment.endSecond}s
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Tres Shorts del episodio" description="Cada Short tiene una función distinta: descubrimiento, repetición musical y aprendizaje.">
              <div className="grid gap-3 lg:grid-cols-3">
                {launchPackage.shorts.map((short, index) => (
                  <article key={short.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-violet-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-100/65">Short {index + 1}</span>
                      <span className="font-mono text-[11px] text-white/30">{short.durationSeconds}s · {short.format}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-black leading-5 text-white/80">{short.title}</h3>
                    <p className="mt-3 text-xs leading-5 text-white/40">{short.hook}</p>
                    <div className="mt-4 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3 text-[11px] leading-5 text-emerald-100/55">
                      {short.payoff}
                    </div>
                  </article>
                ))}
              </div>
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Apertura de ocho segundos" description="El problema debe entenderse sin explicación previa.">
              <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/50">Visual</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{launchPackage.openingHook.visual}</p>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/50">Diálogo</p>
                <p className="mt-2 text-base font-black text-amber-100">“{launchPackage.openingHook.dialogue}”</p>
              </div>
            </Section>

            <Section title="Concepto de miniatura" description="Un personaje, una emoción y un objeto central.">
              <div className="aspect-video rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_55%_40%,rgba(255,216,90,0.38),transparent_20%),linear-gradient(135deg,#18233b,#080b12)] p-5">
                <div className="flex h-full items-end justify-between gap-4">
                  <div className="max-w-[55%]">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[35%] bg-[#FFD85A] text-5xl shadow-[0_0_45px_rgba(255,216,90,0.32)]">✦</div>
                    <p className="mt-3 text-2xl font-black text-white">{launchPackage.thumbnailConcept.optionalText}</p>
                  </div>
                  <div className="max-w-[42%] rounded-xl bg-black/35 p-3 text-[10px] leading-4 text-white/50 backdrop-blur-sm">
                    {launchPackage.thumbnailConcept.focalObject}<br />
                    Emoción: {launchPackage.thumbnailConcept.primaryEmotion}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {launchPackage.thumbnailConcept.avoid.map((item) => (
                  <span key={item} className="rounded-lg border border-red-300/10 bg-red-300/[0.04] px-2.5 py-1.5 text-[10px] text-red-100/50">Evitar: {item}</span>
                ))}
              </div>
            </Section>

            <Section title={launchPackage.song.title} description="Canción original integrada en La Ronda de las Ideas.">
              <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-4">
                {launchPackage.song.chorus.map((line) => (
                  <p key={line} className="text-center text-sm font-bold leading-7 text-violet-50/75">{line}</p>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-white/[0.025] p-3 text-center text-xs text-white/45">
                <span className="font-bold text-cyan-100/65">{launchPackage.song.callAndResponse.call}</span>
                <span className="mx-2">→</span>
                <span className="font-black text-amber-100/70">{launchPackage.song.callAndResponse.response}</span>
              </div>
            </Section>

            <Section title="Objetivos de medición" description="Referencias internas para aprender de los primeros lanzamientos.">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Retención a 30 s" value={launchPackage.measurementGoals.retentionAt30SecondsPercent} suffix="%" />
                <StatCard label="Porcentaje visto" value={launchPackage.measurementGoals.averageViewedPercent} suffix="%" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {launchPackage.measurementGoals.primarySignals.map((signal) => (
                  <span key={signal} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] font-bold text-white/45">{signal}</span>
                ))}
              </div>
            </Section>

            <Section title="Preparar producción" description="Cada botón entrega el contexto del episodio al estudio correspondiente.">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => prepareStudio('workflows', { package: launchPackage, episode })}
                  className="rounded-xl bg-violet-400 px-3 py-3 text-xs font-black text-violet-950 transition hover:bg-violet-300"
                >
                  Construir workflow
                </button>
                <button
                  type="button"
                  onClick={() => prepareStudio('image', { thumbnail: launchPackage.thumbnailConcept, title: selectedTitle })}
                  className="rounded-xl bg-cyan-300 px-3 py-3 text-xs font-black text-cyan-950 transition hover:bg-cyan-200"
                >
                  Crear miniatura
                </button>
                <button
                  type="button"
                  onClick={() => prepareStudio('audio', { song: launchPackage.song })}
                  className="rounded-xl bg-amber-300 px-3 py-3 text-xs font-black text-amber-950 transition hover:bg-amber-200"
                >
                  Producir canción
                </button>
                <button
                  type="button"
                  onClick={() => prepareStudio('video', { mainVideo: launchPackage.mainVideo, shorts: launchPackage.shorts })}
                  className="rounded-xl bg-emerald-300 px-3 py-3 text-xs font-black text-emerald-950 transition hover:bg-emerald-200"
                >
                  Montar vídeos
                </button>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
