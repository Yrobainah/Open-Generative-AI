'use client';

import { useRouter } from 'next/navigation';
import LumoOgaiProofStudio from '../../../../../../components/LumoOgaiProofStudio';

export default function LumoOgaiProofPageClient() {
  const router = useRouter();
  return (
    <LumoOgaiProofStudio
      onBack={() => router.push('/studio/lumo-kids/episodes/S01E01/package')}
      onOpenStudio={(studioId) => router.push('/studio/' + studioId)}
    />
  );
}
