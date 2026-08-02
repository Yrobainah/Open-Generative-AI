'use client';

import { useRouter } from 'next/navigation';
import LumoStoryboardStudio from '../../../../../../components/LumoStoryboardStudio';

export default function LumoStoryboardPageClient() {
  const router = useRouter();

  return (
    <LumoStoryboardStudio
      onBack={() => router.push('/studio/lumo-kids/episodes/S01E01/package')}
      onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)}
    />
  );
}
