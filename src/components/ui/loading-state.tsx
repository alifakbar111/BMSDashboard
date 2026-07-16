import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  count?: number;
  variant?: "card" | "list" | "text";
}

function LoadingState({ className, count = 3, variant = "card" }: LoadingStateProps) {
  if (variant === "text") {
    return (
      <div data-slot="loading-state" className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded-none bg-muted"
            style={{ width: `${70 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div data-slot="loading-state" className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-8 shrink-0 animate-pulse rounded-none bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded-none bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-none bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // card variant (default)
  return (
    <div
      data-slot="loading-state"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-none border border-border p-4 ring-1 ring-foreground/10">
          <div className="mb-3 h-4 w-1/2 animate-pulse rounded-none bg-muted" />
          <div className="mb-2 h-8 w-3/4 animate-pulse rounded-none bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded-none bg-muted" />
        </div>
      ))}
    </div>
  );
}

export { LoadingState };
