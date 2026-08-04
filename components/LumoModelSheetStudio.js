'use client';

import { useMemo, useState } from 'react';
import lumo from '../content/characters/profiles/lumo.json';
import sheet from '../content/characters/model-sheets/lumo-v4.json';

const HANDOFF_KEY = 'lumo_image_studio_handoff_v4';

export default function LumoModelSheetStudio({ onBack, onOpenImageStudio }) {
  const [copied, setCopied] = useState(false);

  const promptBundle = useMemo(
    () => [
      `PROMPT POSITIVO:\n${sheet.generation.positivePrompt}`,
      `PROMPT NEGATIVO:\n${sheet.generation.negativePrompt}`,
      `REFERENCIA:\n${sheet.asset}`,
      `RESOLUCIÓN:\n${sheet.generation.recommendedResolution}`,
      `FUERZA DE REFERENCIA:\n${sheet.generation.referenceStrength}`,
    ].join('\n\n'),
    [],
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptBundle);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const prepareImageStudio = async () => {
    const handoff = {
      version: 4,
      source: 'lumo-character-design-v4',
      characterId: lumo.id,
      characterName: lumo.name,
      modelSheetId: sheet.id,
      referenceAsset: sheet.asset,
      positivePrompt: sheet.generation.positivePrompt,
      negativePrompt: sheet.generation.negativePrompt,
      aspectRatio: sheet.generation.aspectRatio,
      recommendedResolution: sheet.generation.recommendedResolution,
      referenceStrength: sheet.generation.referenceStrength,
      createdAt: new Date().toISOString(),
    };

    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
    try {
      await navigator.clipboard.writeText(promptBundle);
    } catch {
      // El paquete queda guardado aunque el navegador no permita copiar.
    }

    if (typeof onOpenImageStudio === 'function') {
      onOpenImageStudio();
      return;
    }
    window.location.assign('/studio/image?source=lumo-model-sheet&character=lumo');
  };

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1580px]">
        <header className="flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(249,115,22,0.12),transparent_32%),#0b0c10] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/75">Activo canónico · versión {sheet.version}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Character Design maestro de Lumo</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
              Fuente oficial aprobada para conservar diseño, proporciones, materiales y expresiones antes de generar escenas o animaciones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white">
              ← Personajes
            </button>
            <button type="button" onClick={copyPrompt} className="rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-2.5 text-xs font-bold text-amber-100 transition hover:bg-amber-300/[0.14]">
              {copied ? 'Prompt copiado ✓' : 'Copiar prompt'}
            </button>
            <button type="button" onClick={prepareImageStudio} className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-200">
              Preparar en Image Studio →
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_390px]">
          <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3 sm:p-4">
            <div className="overflow-hidden rounded-2xl bg-[#07111c]">
              <img src={sheet.asset} alt="Character Design maestro de Lumo Kids con Lumo, reparto, expresiones y guía técnica" className="h-auto w-full" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-white/35">
              <span>{sheet.canvas.width} × {sheet.canvas.height} · {sheet.format.toUpperCase()}</span>
              <span>Estado: {sheet.approval.humanApproved ? 'aprobada' : 'referencia pendiente de aprobación final'}</span>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
              <h2 className="text-sm font-black">Configuración de generación</h2>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Relación</dt><dd className="mt-1 font-bold text-white/75">{sheet.generation.aspectRatio}</dd></div>
                <div className="rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Resolución</dt><dd className="mt-1 font-bold text-white/75">{sheet.generation.recommendedResolution}</dd></div>
                <div className="col-span-2 rounded-xl bg-white/[0.025] p-3"><dt className="text-white/30">Fuerza de referencia</dt><dd className="mt-1 font-bold text-white/75">{Math.round(sheet.generation.referenceStrength * 100)}%</dd></div>
              </dl>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
              <h2 className="text-sm font-black">Vistas obligatorias</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sheet.requiredViews.map((view) => <span key={view} className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.05] px-2.5 py-1.5 text-[11px] text-cyan-100/65">{view}</span>)}
              </div>
              <h2 className="mt-6 text-sm font-black">Vistas pendientes de producción</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sheet.pendingViews.map((view) => <span key={view} className="rounded-lg border border-amber-300/10 bg-amber-300/[0.05] px-2.5 py-1.5 text-[11px] text-amber-100/65">{view}</span>)}
              </div>
              <h2 className="mt-6 text-sm font-black">Invariantes</h2>
              <ul className="mt-3 space-y-2">
                {sheet.canonicalInvariants.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-white/50"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />{item}</li>)}
              </ul>
            </section>
          </aside>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
            <h2 className="text-sm font-black">Prompt positivo</h2>
            <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[0.035] p-4 font-mono text-xs leading-6 text-amber-50/70">{sheet.generation.positivePrompt}</div>
          </section>
          <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
            <h2 className="text-sm font-black">Prompt negativo</h2>
            <div className="mt-4 rounded-2xl border border-red-300/10 bg-red-300/[0.035] p-4 font-mono text-xs leading-6 text-red-50/65">{sheet.generation.negativePrompt}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
