'use client';

import { useRouter } from 'next/navigation';
import LumoCharacterLibrary from '../../../../components/LumoCharacterLibrary';

export default function LumoCharacterLibraryPageClient() {
  const router = useRouter();
  return <LumoCharacterLibrary onBack={() => router.push('/studio/lumo-kids')} />;
}
