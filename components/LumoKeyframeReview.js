'use client';

import { useMemo, useState } from 'react';
import keyframes from '../content/season-01/keyframes/S01E01.keyframes.json';
import storyboard from '../content/season-01/storyboards/S01E01.storyboard.json';

export default function LumoKeyframeReview({ onBack, onOpenStudio }) {
  const [selectedId, setSelectedId] = useState(keyframes.frames[0].sceneId);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => keyframes.frames.find((frame) => frame.sceneId === selectedId) || keyframes.frames[0],
    [selectedId],
  );
  const scene = useMemo(
    () => storyboard.scenes.find((item) => item.id === selected.sceneId),
    [selected.sceneId],
  );

  const payload = {
    source: 'lumo-keyframe-review',
    episodeCode: keyframes.episodeCode,
    keyframeSetId: keyframes.id,
    frame: selected,
    scene,
    visualStyle: storyboard.visualStyle,
    characterReferences: storyboard.characterReferences,
    approvalRequired: true,
  };

  const copyPayload = async () => {
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const openStudio = (studioId) => {
    window.sessionStorage.setItem('lumo_keyframe_handoff_v1', JSON.stringify({
      ...payload,
      createdAt: new Date().toISOString(),
      targetStudio: studioId,
    }));
    if (typeof onOpenStudio === 'function') onOpenStudio(studioId);
  };

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1680px]">
        <header className="rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.15),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(34,211,238,0.13),transparent_30%),#0b0c10] p-6 sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/75">Keyframes de referencia · v{keyframes.version}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Primer pase visual del piloto</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Cuatro imágenes estratégicas para aprobar diseño, emoción, iluminación y continuidad antes de producir las dieciocho escenas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyPayload} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08]">
                {copied ? 'Paquete copiado ✓' : 'Copiar paquete'}
              </button>
              <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08]">← Volver al storyboard</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-3 py-1.5 text-[11px] font-bold text-amber-100">4 keyframes</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-white/50">1600 × 900</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-white/50">SVG editable</span>
            <span className="rounded-full border border-red-300/15 bg-red-300/[0.05] px-3 py-1.5 text-[11px] font-bold text-red-100/65">Aprobación humana pendiente</span>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3 xl:sticky xl:top-5 xl:h-fit">
            <div className="px-2 pb-3 pt-1">
              <h2 className="text-sm font-black">Fotogramas prioritarios</h2>
              <p className="mt-1 text-xs text-white/35">Gancho, presentación, emoción y recompensa.</p>
            </div>
            <div className="space-y-2">
              {keyframes.frames.map((frame) => {
                const active = frame.sceneId === selected.sceneId;
                return (
                  <button key={frame.sceneId} type="button" onClick={() => setSelectedId(frame.sceneId)} className={`w-full rounded-2xl border p-3 text-left transition ${active ? 'border-amber-300/30 bg-amber-300/[0.08]' : 'border-transparent bg-white/[0.015] hover:border-white/[0.07] hover:bg-white/[0.035]'}`}>
                    <img src={frame.asset} alt={`Keyframe ${frame.sceneId}: ${frame.title}`} className="aspect-video w-full rounded-xl border border-white/[0.08] object-cover" />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={`text-xs font-black ${active ? 'text-amber-100' : 'text-white/65'}`}>{frame.sceneId}</span>
                      <span className="text-[10px] text-white/30">{frame.timecode}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-white/70">{frame.title}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0c0d11]">
              <img src={selected.asset} alt={`Keyframe ${selected.sceneId}: ${selected.title}`} className="aspect-video w-full bg-black/20 object-contain" />
              <div className="border-t border-white/[0.06] p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80">{selected.sceneId}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-white/40">{selected.timecode}</span>
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{selected.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">{selected.purpose}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openStudio('image')} className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black transition hover:bg-amber-200">Refinar en Image Studio</button>
                    <button type="button" onClick={() => openStudio('video')} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/[0.1]">Preparar animación</button>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Qué revisar</h3>
                <ul className="mt-4 space-y-2">
                  {selected.reviewFocus.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-white/55"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />{item}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Datos de la escena</h3>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Acción</dt><dd className="mt-1.5 leading-5 text-white/60">{scene?.action}</dd></div>
                  <div className="rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Cámara</dt><dd className="mt-1.5 leading-5 text-white/60">{scene?.shot?.size} · {scene?.camera?.movement}</dd></div>
                  <div className="rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Iluminación</dt><dd className="mt-1.5 leading-5 text-white/60">{scene?.lighting}</dd></div>
                </dl>
              </section>
            </div>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <h3 className="text-sm font-black">Criterios globales de aprobación</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {keyframes.reviewCriteria.map((criterion) => (
                  <div key={criterion} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs leading-5 text-white/50">□ {criterion}</div>
                ))}
              </div>
              <p className="mt-4 rounded-xl border border-red-300/10 bg-red-300/[0.04] p-3 text-xs leading-5 text-red-100/60">Estas imágenes son referencias vectoriales iniciales. No deben marcarse como definitivas ni utilizarse para publicación hasta completar la revisión artística humana.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
