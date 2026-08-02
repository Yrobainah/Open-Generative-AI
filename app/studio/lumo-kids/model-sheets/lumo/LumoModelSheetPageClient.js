'use client';

import { useRouter } from 'next/navigation';
import LumoModelSheetStudio from '../../../../../components/LumoModelSheetStudio';

export default function LumoModelSheetPageClient() {
  const router = useRouter();

  return (
    <LumoModelSheetStudio
      onBack={() => router.push('/studio/lumo-kids/characters')}
      onOpenImageStudio={() => router.push('/studio/image?source=lumo-model-sheet&character=lumo')}
    />
  );
}
