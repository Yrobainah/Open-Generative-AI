'use client';

import { useRouter } from 'next/navigation';
import LumoStoryboardStudio from '../../../../../../components/LumoStoryboardStudio';

export default function LumoStoryboardPageClient() {
  const router = useRouter();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/keyframes')}
        className="fixed right-5 top-5 z-[60] rounded-xl border border-amber-300/25 bg-[#0b0c10]/90 px-4 py-2.5 text-xs font-black text-amber-100 shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-amber-300/40 hover:bg-amber-300/10"
      >
        Revisar keyframes →
      </button>
      <LumoStoryboardStudio
        onBack={() => router.push('/studio/lumo-kids/episodes/S01E01/package')}
        onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)}
      />
    </div>
  );
}
