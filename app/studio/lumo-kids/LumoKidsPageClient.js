'use client';

import { useRouter } from 'next/navigation';
import LumoKidsStudio from '../../../components/LumoKidsStudio';

export default function LumoKidsPageClient() {
  const router = useRouter();

  return (
    <div className="relative h-screen overflow-hidden bg-[#06070a]">
      <div className="absolute right-5 top-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push('/studio/lumo-kids/references')}
          className="rounded-xl border border-cyan-300/25 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-cyan-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
        >
          Referencias OpenArt →
        </button>
        <button
          type="button"
          onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/production')}
          className="rounded-xl border border-emerald-300/25 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-emerald-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
        >
          Producción protegida →
        </button>
        <button
          type="button"
          onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/package')}
          className="rounded-xl border border-amber-300/25 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-amber-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-amber-300/40 hover:bg-amber-300/10"
        >
          Paquete del piloto →
        </button>
        <button
          type="button"
          onClick={() => router.push('/studio/lumo-kids/characters')}
          className="rounded-xl border border-violet-300/20 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-violet-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-violet-300/35 hover:bg-violet-300/10"
        >
          Personajes y biblia visual →
        </button>
      </div>
      <LumoKidsStudio onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)} />
    </div>
  );
}
