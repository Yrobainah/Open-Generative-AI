'use client';

import { useRouter } from 'next/navigation';
import LumoEpisodeLaunchPackage from '../../../../../../components/LumoEpisodeLaunchPackage';

export default function LumoEpisodeLaunchPackagePageClient() {
  const router = useRouter();

  return (
    <LumoEpisodeLaunchPackage
      onBack={() => router.push('/studio/lumo-kids')}
      onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)}
    />
  );
}
