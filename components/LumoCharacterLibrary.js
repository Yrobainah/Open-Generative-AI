'use client';

import { useMemo, useState } from 'react';
import lumo from '../content/characters/profiles/lumo.json';
import nara from '../content/characters/profiles/nara.json';
import tuno from '../content/characters/profiles/tuno.json';
import biri from '../content/characters/profiles/biri.json';
import pompon from '../content/characters/profiles/pompon.json';

const CHARACTERS = [lumo, nara, tuno, biri, pompon];

function CharacterMark({ character, size = 76 }) {
  const palette = character.visual.palette;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-[32%] border border-white/15 shadow-xl"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 25%, ${palette.secondary}, ${palette.primary} 62%, ${palette.accent})`,
        boxShadow: `0 16px 36px ${palette.primary}25`,
      }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <span className="h-3 w-2.5 rounded-full" style={{ backgroundColor: palette.eyes }} />
        <span className="h-3 w-2.5 rounded-full" style={{ backgroundColor: palette.eyes }} />
      </div>
      <span className="absolute bottom-[20%] h-1.5 w-5 rounded-b-full border-b-2" style={{ borderColor: palette.eyes }} />
    </div>
  );
}

function ColorSwatch({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
      <div className="h-8 rounded-lg border border-white/10" style={{ backgroundColor: value }} />
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-0.5 font-mono text-[11px] text-white/70">{value}</p>
    </div>
  );
}

export default function LumoCharacterLibrary({ onBack }) {
  const [selectedId, setSelectedId] = useState(CHARACTERS[0].id);
  const selected = useMemo(
    () => CHARACTERS.find((character) => character.id === selectedId) || CHARACTERS[0],
    [selectedId],
  );

  return (
    <div className="min-h-screen bg-[#06070a] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,0.13),transparent_32%),#0b0c10] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Biblia visual · versión 1</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Biblioteca de personajes</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Referencias maestras para mantener silueta, proporciones, paleta, voz y personalidad en cada generación.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white sm:self-auto"
          >
            ← Volver al estudio
          </button>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-3">
            <div className="px-2 pb-3 pt-1">
              <h2 className="text-sm font-black">Pandilla principal</h2>
              <p className="mt-1 text-xs text-white/35">Cinco siluetas originales y complementarias.</p>
            </div>
            <div className="space-y-2">
              {CHARACTERS.map((character) => {
                const active = character.id === selected.id;
                return (
                  <button
                    type="button"
                    key={character.id}
                    onClick={() => setSelectedId(character.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-cyan-300/25 bg-cyan-300/[0.08]'
                        : 'border-transparent bg-white/[0.015] hover:border-white/[0.07] hover:bg-white/[0.035]'
                    }`}
                  >
                    <CharacterMark character={character} size={48} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-white">{character.name}</span>
                      <span className="mt-1 block truncate text-[11px] text-white/40">{character.characterType}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="space-y-5">
            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <CharacterMark character={selected} size={112} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black tracking-tight">{selected.name}</h2>
                    <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/45">
                      Escala {selected.visual.scaleRelativeToLumo}× Lumo
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cyan-100/75">{selected.role}</p>
                  <p className="mt-3 text-sm leading-6 text-white/50">
                    {selected.visual.silhouette}. {selected.visual.bodyShape}. {selected.visual.face}.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.personality.map((trait) => (
                      <span key={trait} className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[11px] font-bold text-white/55">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Paleta fija</h3>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(selected.visual.palette).map(([key, value]) => (
                    <ColorSwatch key={key} label={key} value={value} />
                  ))}
                </div>
                <h3 className="mt-6 text-sm font-black">Rasgos distintivos</h3>
                <ul className="mt-3 space-y-2">
                  {selected.visual.signatureFeatures.map((feature) => (
                    <li key={feature} className="flex gap-2 text-xs leading-5 text-white/50">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5">
                <h3 className="text-sm font-black">Voz y actuación</h3>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="text-white/30">Registro</dt>
                    <dd className="mt-1 font-bold text-white/70">{selected.voice.register}</dd>
                  </div>
                  <div className="rounded-xl bg-white/[0.025] p-3">
                    <dt className="text-white/30">Ritmo</dt>
                    <dd className="mt-1 font-bold text-white/70">{selected.voice.pace}</dd>
                  </div>
                  <div className="col-span-2 rounded-xl bg-white/[0.025] p-3">
                    <dt className="text-white/30">Tono</dt>
                    <dd className="mt-1 font-bold text-white/70">{selected.voice.tone}</dd>
                  </div>
                </dl>
                <h3 className="mt-6 text-sm font-black">Expresiones maestras</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.expressions.map((expression) => (
                    <span key={expression} className="rounded-lg border border-violet-300/10 bg-violet-300/[0.055] px-2.5 py-1.5 text-[11px] text-violet-100/65">
                      {expression}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-white/[0.07] bg-[#0c0d11] p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
                <div>
                  <h3 className="text-sm font-black">Prompt maestro</h3>
                  <p className="mt-1 text-xs text-white/35">Base inmutable que se completará con acción, emoción, escenario y cámara.</p>
                  <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4 font-mono text-xs leading-6 text-cyan-50/70">
                    {selected.promptTemplate}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black">Nunca generar</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.negativePrompt.map((item) => (
                      <span key={item} className="rounded-lg border border-red-300/10 bg-red-300/[0.045] px-2.5 py-1.5 text-[11px] text-red-100/60">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
