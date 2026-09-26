'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorState
        title="Something went wrong"
        message="An unexpected error occurred while loading this page."
        onRetry={reset}
      />
    </div>
  );
}
