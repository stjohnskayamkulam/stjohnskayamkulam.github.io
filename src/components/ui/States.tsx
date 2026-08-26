import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Loading">
      <Loader2 className={cn("size-5 animate-spin text-brand", className)} />
    </span>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-soft">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Placeholder cards that keep list layouts from jumping while data loads. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card animate-pulse p-5">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-black/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-black/10" />
              <div className="h-3 w-1/3 rounded bg-black/5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-black/5" />
            <div className="h-3 w-4/5 rounded bg-black/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-brand/50">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="card border-red-100 bg-red-50/50 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-red-800">
        Something went wrong
      </h3>
      <p className="mt-2 text-sm text-red-700">{error.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
