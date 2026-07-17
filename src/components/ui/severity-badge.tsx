"use client";

import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  level: "critical" | "warning" | "info";
  className?: string;
}

const severityTokens = {
  critical: "var(--color-severity-critical)",
  warning: "var(--color-severity-warning)",
  info: "var(--color-severity-info)",
} as const;

function SeverityBadge({ level, className }: SeverityBadgeProps) {
  const token = severityTokens[level];
  return (
    <span
      data-slot="severity-badge"
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: token,
        backgroundColor: `color-mix(in srgb, ${token} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${token} 20%, transparent)`,
      }}
    >
      {level}
    </span>
  );
}

export { SeverityBadge };
export type { SeverityBadgeProps };