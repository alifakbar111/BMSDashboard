"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  GripVertical,
  Settings,
  Copy,
  Trash2,
  Maximize2,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import KPICard from "@/components/cards/KPICard";
import BarChartCard from "@/components/cards/BarChartCard";
import LineChartCard from "@/components/cards/LineChartCard";
import GaugeCard from "@/components/cards/GaugeCard";
import type { DashboardCard as DashboardCardType } from "@/lib";

interface DashboardCardProps {
  card: DashboardCardType;
  onConfigure: (id: string) => void;
}

const SIZE_OPTIONS = [
  { key: "small", label: "1×1", width: 1, height: 1 },
  { key: "wide", label: "2×1", width: 2, height: 1 },
  { key: "tall", label: "1×2", width: 1, height: 2 },
  { key: "large", label: "2×2", width: 2, height: 2 },
] as const;

export default function DashboardCard({ card, onConfigure }: DashboardCardProps) {
  const { removeCard, duplicateCard, resizeCard } = useDashboardStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const currentSize = SIZE_OPTIONS.find(
    (s) => s.width === card.width && s.height === card.height,
  )?.key ?? "small";

  const gridClass =
    card.width === 2 && card.height === 2
      ? "md:col-span-2 md:row-span-2"
      : card.width === 2
        ? "md:col-span-2"
        : card.height === 2
          ? "md:row-span-2"
          : "";

  return (
    <div
      ref={setNodeRef}
      className={cn("transition-all duration-200", gridClass, isDragging && "opacity-50")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <button
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              aria-label="Drag to reorder"
            >
              <GripVertical className="size-4" />
            </button>
            <CardTitle className="truncate">{card.config.title}</CardTitle>
          </div>
          <CardAction>
            <div className="flex items-center gap-0.5">
              {/* Resize group */}
              {SIZE_OPTIONS.map((size) => (
                <Button
                  key={size.key}
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => resizeCard(card.id, size.key)}
                  className={cn(
                    currentSize === size.key && "bg-accent text-accent-foreground",
                  )}
                  aria-label={`Resize to ${size.label}`}
                  title={size.label}
                >
                  {size.key === "small" ? (
                    <Minus className="size-3" />
                  ) : (
                    <Maximize2 className="size-3" />
                  )}
                </Button>
              ))}

              {/* Duplicate */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => duplicateCard(card.id)}
                aria-label="Duplicate card"
              >
                <Copy className="size-3" />
              </Button>

              {/* Configure */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onConfigure(card.id)}
                aria-label="Configure card"
              >
                <Settings className="size-3" />
              </Button>

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeCard(card.id)}
                aria-label="Remove card"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex-1 content-around">
          <CardBody card={card} />
        </CardContent>
      </Card>
    </div>
  );
}

function CardBody({ card }: { card: DashboardCardType }) {
  const { config } = card;

  if (!config.dataSource || !config.yAxis) {
    return (
      <EmptyState
        title="Not configured"
        description="Click settings to configure this card with a data source."
      />
    );
  }

  if (config.type === "kpi") {
    return <KPICard config={config} />;
  }

  if (config.type === "bar") {
    return <BarChartCard config={config} />;
  }

  if (config.type === "line") {
    return <LineChartCard config={config} />;
  }

  if (config.type === "gauge") {
    return <GaugeCard config={config} />;
  }

  // Fallback — should never reach here with valid config types
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Unknown card type
    </div>
  );
}
