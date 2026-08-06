import LumoReferenceReviewV5PageClient from './LumoReferenceReviewV5PageClient';

export const metadata = {
  title: 'Revisión canónica · Lumo Kids',
  description: 'Revisión y descarga ZIP de referencias canónicas aprobadas para OpenArt.',
};

export default function LumoReferenceGeneratorPage() {
  return <LumoReferenceReviewV5PageClient />;
}
