'use client';

import { useRouter } from 'next/navigation';
import LumoKeyframeReview from '../../../../../../components/LumoKeyframeReview';

export default function LumoKeyframeReviewPageClient() {
  const router = useRouter();
  return (
    <LumoKeyframeReview
      onBack={() => router.push('/studio/lumo-kids/episodes/S01E01/storyboard')}
      onOpenStudio={(studioId) => router.push(`/studio/${studioId}`)}
    />
  );
}
