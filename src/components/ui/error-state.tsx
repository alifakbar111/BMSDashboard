"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-none bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-6" />
      </div>
      <div>
        <h3 className="font-heading text-sm font-medium">{title}</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
