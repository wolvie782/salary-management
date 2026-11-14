import { PageLoader } from '../components/Loader';

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <PageLoader label="Loading…" />
    </main>
  );
}
