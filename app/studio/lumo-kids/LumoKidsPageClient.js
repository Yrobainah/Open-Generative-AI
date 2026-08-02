'use client';

import { useRouter } from 'next/navigation';
import LumoKidsStudio from '../../../components/LumoKidsStudio';

export default function LumoKidsPageClient() {
  const router = useRouter();

  return (
    <div className="h-screen overflow-hidden bg-[#06070a]">
      <LumoKidsStudio onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)} />
    </div>
  );
}
