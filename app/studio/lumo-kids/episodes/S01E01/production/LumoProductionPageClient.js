'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const HANDOFF_KEY = 'lumo_safe_production_handoff_v2';
const REQUIRED = [
  ['canon', 'He comprobado que las referencias proceden de la guía visual original.'],
  ['cast', 'No hay personajes principales dibujados dentro del storyboard o fotograma inicial.'],
  ['nublo', 'Nublo y la niebla violeta no aparecen en ninguna referencia de esta sección.'],
  ['prompt', 'El prompt está por debajo de 10.000 caracteres.'],
  ['budget', 'Haré una sola generación y revisaré el resultado antes de continuar.'],
];

const VIDEO_PROMPT = `Create S01E01-S01, the opening of the premium stylized 3D preschool series “Lumo Kids: Lumo y la luz de la fiesta”.

DURATION: exactly 15 seconds. FORMAT: 16:9, 1280x720, 24 fps. NO GENERATED SPEECH. This section introduces only Brillavalle and ends before the principal characters enter frame. The approved narrator will be added during editing so voice identity cannot drift.

REFERENCE RULES
Use the canonical Brillavalle reference for architecture, materials, lighting and geography. Use the canonical Fountain of Light and Heart of Light references for prop identity. Do not use a character sheet as the primary image. Do not display reference sheets, panels, captions, labels, logos, interface elements or text.

CANONICAL WORLD
Brillavalle is a magical woodland village built into giant trees and roots, with rounded homes, bridges, warm lanterns, glowing flowers and winding paths. Preserve the same village identity throughout the shot. The central plaza has the canonical Fountain of Light, blue water and warm golden details. The Heart of Light is a clearly recognizable golden heart floating at the canonical height and scale above the fountain. It never becomes a sphere, gem, drop or lantern.

TIMELINE
0:00–0:05 — Aerial nighttime view above a vast magical forest under a clear moon and stars. The camera glides smoothly over the treetops and reveals Brillavalle glowing in the valley. Small waterfalls and warm village lights establish a peaceful enchanted world.

0:05–0:10 — Continue the same coherent camera movement, descending between giant trees toward Brillavalle. Pass rounded homes, bridges, lanterns and glowing flowers. A few distant secondary woodland animals walk toward the plaza, but no principal character is visible or recognizable.

0:10–0:15 — Arrive at a wide establishing view of the main plaza. The Fountain of Light is on and the Heart of Light floats safely above it. Distinct secondary villagers prepare stalls, garlands and flowers. End on a stable cinematic composition of the fountain and Heart, ready to cut to the already generated S02 preparation scene.

SECONDARY CITIZENS
Use only clearly distinct rabbits, badgers, owls, otters, hedgehogs, turtles, deer or squirrels. Keep them small or medium in frame. No citizen may copy Lumo’s golden glowing body or antennae, Nara’s leafy silhouette, Tuno’s goggles and raccoon design, Biri’s blue-orange design, Pompón’s purple fluffy silhouette or Nublo’s dark blue-violet design.

AUDIO
Generate only a continuous child-friendly instrumental score: soft celesta, pizzicato strings, gentle woodwinds and subtle magical chimes. Add soft wind, distant waterfalls, fountain water, lantern chimes, gentle footsteps and quiet friendly animal activity. No narrator, character dialogue, singing, lyrics, countdown or final cadence.

VISUAL STYLE
Premium stylized 3D preschool animation; tactile natural materials; rounded friendly forms; warm golden festival light contrasted with soft blue night ambience; smooth controlled cinematic camera; stable geometry; consistent scale; clear readable staging.

MANDATORY END STATE
Brillavalle remains peaceful and illuminated. The fountain is on. The Heart remains safely floating above it. No principal character has entered frame. No conflict or countdown has started.

STRICT EXCLUSIONS
No Lumo, Nara, Tuno, Biri, Pompón or Nublo visible in this opening section. No violet mist, theft, darkness, danger, fear, chase, maze, observatory, fireworks or final celebration. No humans, principal-character clones, merged bodies, extra limbs, distorted faces, changing fountain design, changing Heart shape or size, split screen, storyboard panels, captions, subtitles, logos, readable text, interface elements, photorealism or imitation of an existing franchise.`;

const NARRATION = 'En el corazón del bosque mágico estaba Brillavalle, un lugar donde cada pequeña luz tenía algo que contar. Aquella noche, Lumo y sus amigos se preparaban para la Fiesta de las Mil Luces.';

export default function LumoProductionPageClient() {
  const router = useRouter();
  const [checks, setChecks] = useState({});
  const [balance, setBalance] = useState('22.92');
  const [copied, setCopied] = useState('');
  const promptChars = VIDEO_PROMPT.length;
  const estimatedCost = 2.25;
  const remaining = Math.max(0, (Number(balance) || 0) - estimatedCost).toFixed(2);
  const ready = REQUIRED.every(([id]) => checks[id]) && promptChars < 10000;

  const references = useMemo(() => [
    { name: 'Brillavalle canónico', src: '/lumo-kids/continuity/ENV-BRILLAVALLE-canonical-v2.png', required: true },
    { name: 'Fuente canónica', src: '/lumo-kids/continuity/PROP-FOUNTAIN-OF-LIGHT-001-v1.png', required: true },
    { name: 'Corazón canónico', src: '/lumo-kids/continuity/PROP-HEART-OF-LIGHT-001-v1.png', required: true },
  ], []);

  async function prepareVideo() {
    if (!ready) return;
    const payload = {
      schemaVersion: 2,
      source: 'lumo-safe-production-guard',
      episode: 'S01E01',
      section: 'S01E01-S01',
      targetStudio: 'video',
      model: 'seedance-v2.0-i2v',
      durationSeconds: 15,
      aspectRatio: '16:9',
      resolution: '720p',
      prompt: VIDEO_PROMPT,
      promptChars,
      references,
      narrationExternal: true,
      narrationText: NARRATION,
      maxPaidVariations: 1,
      expectedCostUsd: estimatedCost,
      humanReviewRequired: true,
      forbiddenCharacters: ['lumo', 'nara', 'tuno', 'biri', 'pompon', 'nublo'],
    };
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    await navigator.clipboard?.writeText(VIDEO_PROMPT);
    setCopied('video');
    window.setTimeout(() => router.push('/studio/video'), 400);
  }

  async function copyNarration() {
    await navigator.clipboard?.writeText(NARRATION);
    setCopied('narration');
    window.setTimeout(() => setCopied(''), 1500);
  }

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.15),transparent_35%),#0b0d12] p-6 sm:p-8">
          <button onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45 hover:text-white">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200/70">Production Guard v2</p>
              <h1 className="mt-2 text-3xl font-black">S01E01-S01 · Bienvenidos a Brillavalle</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Flujo bloqueado por canon y presupuesto. Esta versión elimina a los protagonistas del plano pagado: así no pueden rediseñarse. La narración se añade después y conserva siempre la misma voz.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3"><div className="text-xl font-black">{promptChars}</div><div className="text-[10px] text-white/35">caracteres</div></div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3"><div className="text-xl font-black">${estimatedCost.toFixed(2)}</div><div className="text-[10px] text-white/35">máximo</div></div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3"><div className="text-xl font-black text-emerald-200">${remaining}</div><div className="text-[10px] text-white/35">restante</div></div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
            <div className="flex items-center justify-between"><h2 className="font-black">Referencias que sí se enviarán</h2><span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-200">SIN PERSONAJES PRINCIPALES</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {references.map((item) => <figure key={item.src} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"><img src={item.src} alt={item.name} className="aspect-video w-full object-cover"/><figcaption className="p-3 text-xs font-bold text-white/65">{item.name}</figcaption></figure>)}
            </div>
            <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black">Prompt final protegido</h3><span className={promptChars < 10000 ? 'text-xs font-black text-emerald-200' : 'text-xs font-black text-red-300'}>{promptChars}/10.000</span></div>
              <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/55">{VIDEO_PROMPT}</pre>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Bloqueo previo al gasto</h2>
              <div className="mt-4 space-y-3">{REQUIRED.map(([id,label]) => <label key={id} className="flex cursor-pointer gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3"><input type="checkbox" checked={Boolean(checks[id])} onChange={e=>setChecks(v=>({...v,[id]:e.target.checked}))} className="mt-1"/><span className="text-xs leading-5 text-white/60">{label}</span></label>)}</div>
              <label className="mt-4 block text-xs font-black text-white/45">Saldo actual ($)<input value={balance} onChange={e=>setBalance(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none"/></label>
              <button disabled={!ready} onClick={prepareVideo} className="mt-4 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-25">{ready ? 'Copiar prompt y abrir Video Studio' : 'Completa las cinco comprobaciones'}</button>
              <p className="mt-3 text-[11px] leading-5 text-white/35">El botón solo prepara una solicitud. No genera automáticamente ni permite varias versiones pagadas.</p>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5">
              <h2 className="font-black text-amber-100">Narración oficial externa</h2>
              <p className="mt-3 text-sm leading-6 text-amber-50/65">“{NARRATION}”</p>
              <button onClick={copyNarration} className="mt-4 rounded-xl border border-amber-200/20 px-4 py-2.5 text-xs font-black text-amber-100">{copied === 'narration' ? 'Copiada ✓' : 'Copiar narración'}</button>
            </section>

            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-5 text-xs leading-6 text-emerald-50/65">
              <strong className="text-emerald-100">Estrategia de rescate:</strong> conservar los primeros nueve segundos del vídeo generado y su audio; usar una nueva toma solo cuando aporte algo imprescindible. El corte de S01 termina en la fuente y enlaza directamente con S02, evitando pagar otra aparición de los cinco personajes.
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
