'use client';

import { useRouter } from 'next/navigation';
import LumoEpisodeLaunchPackage from '../../../../../../components/LumoEpisodeLaunchPackage';

export default function LumoEpisodeLaunchPackagePageClient() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-[#06070a]">
      <button
        type="button"
        onClick={() => router.push('/studio/lumo-kids/episodes/S01E01/storyboard')}
        className="fixed bottom-5 right-5 z-[100] rounded-2xl border border-cyan-300/25 bg-[#0b0c10]/95 px-5 py-3 text-xs font-black text-cyan-100 shadow-2xl shadow-black/40 backdrop-blur-md transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
      >
        Abrir guion y storyboard →
      </button>
      <LumoEpisodeLaunchPackage
        onBack={() => router.push('/studio/lumo-kids')}
        onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)}
      />
    </div>
  );
}
