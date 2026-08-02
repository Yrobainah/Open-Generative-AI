'use client';

import { useRouter } from 'next/navigation';
import LumoKidsStudio from '../../../components/LumoKidsStudio';

export default function LumoKidsPageClient() {
  const router = useRouter();

  return (
    <div className="relative h-screen overflow-hidden bg-[#06070a]">
      <button
        type="button"
        onClick={() => router.push('/studio/lumo-kids/characters')}
        className="absolute right-5 top-5 z-50 rounded-xl border border-cyan-300/20 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-cyan-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
      >
        Personajes y biblia visual →
      </button>
      <LumoKidsStudio onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)} />
    </div>
  );
}
