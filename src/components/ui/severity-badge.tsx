"use client";

import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  level: "critical" | "warning" | "info";
  className?: string;
}

const severityVariants = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
} as const;

function SeverityBadge({ level, className }: SeverityBadgeProps) {
  return (
    <span
      data-slot="severity-badge"
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-xs font-medium",
        severityVariants[level],
        className,
      )}
    >
      {level}
    </span>
  );
}

export { SeverityBadge };
export type { SeverityBadgeProps };
