'use client';

import { useRouter } from 'next/navigation';
import LumoCharacterLibrary from '../../../../components/LumoCharacterLibrary';

export default function LumoCharacterLibraryPageClient() {
  const router = useRouter();

  return (
    <div className="relative">
      <LumoCharacterLibrary onBack={() => router.push('/studio/lumo-kids')} />
      <button
        type="button"
        onClick={() => router.push('/studio/lumo-kids/model-sheets/lumo')}
        className="fixed bottom-5 right-5 z-50 rounded-2xl border border-amber-200/20 bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 shadow-2xl shadow-black/30 transition hover:bg-amber-200"
      >
        Ver hoja de modelo de Lumo →
      </button>
    </div>
  );
}
