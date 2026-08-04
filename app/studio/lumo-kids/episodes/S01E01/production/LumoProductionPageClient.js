'use client';

import { useRouter } from 'next/navigation';

const REFERENCES = [
  { name: 'Character Design maestro', src: '/lumo-kids/canon/Character-Design-v4.png', note: 'Fuente de verdad bloqueada por SHA-256.' },
  { name: 'Reparto principal', src: '/lumo-kids/canon/CAST-main-six-lineup-v4.png', note: 'Seis siluetas, escala y proporciones aprobadas.' },
  { name: 'Brillavalle', src: '/lumo-kids/canon/world/ENV-BRILLAVALLE-master-v4.png', note: 'Mundo bloqueado: arquitectura, geografía y luz.' },
];

const JOBS = [
  { id: 'PT01', duration: '5 s', cast: 'Nublo', state: 'Pendiente de preflight' },
  { id: 'PT02', duration: '10 s', cast: 'Nublo', state: 'Bloqueado por PT01' },
  { id: 'PT03', duration: '10 s', cast: 'Lumo · Biri · Nublo', state: 'Bloqueado por PT02' },
];

const CHECKS = [
  'Hashes de personajes y Brillavalle',
  'Saldo vivo de MuAPI',
  'Cotización exacta del payload',
  'Una sola solicitud activa',
  'Revisión visual después de cada plano',
];

function Metric({ value, label, tone = 'text-white' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
      <div className={`text-xl font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/35">{label}</div>
    </div>
  );
}

export default function LumoProductionPageClient() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,.15),transparent_34%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45 transition hover:text-white">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200/75">Producción protegida · canon v4</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">S01E01 · La luz prestada</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">Microepisodio educativo de 60 segundos: pedir ayuda y compartir permite reparar un error sin culpar ni dejar a nadie fuera.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value="60 s" label="objetivo" />
              <Metric value="25 s" label="primera prueba" />
              <Metric value="$16.44" label="tope total" tone="text-cyan-100" />
              <Metric value="$4.23" label="reserva" tone="text-emerald-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-200/60">Fuente ejecutable</p>
                  <h2 className="mt-1 font-black">Canon visual bloqueado</h2>
                </div>
                <span className="w-fit rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-100">HASH LOCK ACTIVO</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {REFERENCES.map((item) => (
                  <figure key={item.src} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    <img src={item.src} alt={item.name} className="aspect-video w-full object-cover" />
                    <figcaption className="p-3">
                      <p className="text-xs font-black text-white/75">{item.name}</p>
                      <p className="mt-1 text-[11px] leading-5 text-white/35">{item.note}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-violet-200/60">Cola MuAPI</p>
                  <h2 className="mt-1 font-black">Prueba reutilizable de 25 segundos</h2>
                </div>
                <span className="rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-100">TOPE $7.52</span>
              </div>
              <div className="mt-4 space-y-2">
                {JOBS.map((job) => (
                  <div key={job.id} className="grid gap-2 rounded-2xl border border-white/[.07] bg-black/20 px-4 py-3 sm:grid-cols-[70px_70px_minmax(0,1fr)_170px] sm:items-center">
                    <span className="text-xs font-black text-cyan-100">{job.id}</span>
                    <span className="text-xs text-white/55">{job.duration}</span>
                    <span className="text-xs text-white/60">{job.cast}</span>
                    <span className="text-[10px] font-black uppercase tracking-wide text-amber-100/65">{job.state}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/proof')} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200">Abrir paquete de prueba</button>
                <button type="button" onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/storyboard')} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/60 transition hover:bg-white/[.05]">Revisar storyboard</button>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200/65">Saldo confirmado</p>
              <h2 className="mt-2 text-2xl font-black text-cyan-50">20,67 USD</h2>
              <p className="mt-2 text-xs leading-5 text-cyan-50/50">Confirmado por Yariel el 4 de agosto de 2026. Antes de comprar se sustituye por la lectura viva de MuAPI.</p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <h2 className="font-black">Preflight obligatorio</h2>
              <ul className="mt-3 space-y-2">
                {CHECKS.map((check) => <li key={check} className="flex gap-2 text-xs leading-5 text-white/50"><span className="text-emerald-200">✓</span>{check}</li>)}
              </ul>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5">
              <h2 className="font-black text-amber-100">Sin publicación automática</h2>
              <p className="mt-2 text-xs leading-5 text-amber-50/55">YouTube recibe primero una carga privada, marcada para niños y con contenido sintético declarado. Solo Yariel desbloquea el máster final.</p>
            </section>

            <section className="rounded-3xl border border-rose-300/15 bg-rose-300/[.035] p-5">
              <h2 className="font-black text-rose-100">Teaser anterior archivado</h2>
              <p className="mt-2 text-xs leading-5 text-rose-50/50">La prueba editorial rechazada no se muestra, no se publica y no entra como referencia de generación.</p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
