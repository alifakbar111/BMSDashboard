"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDashboardStore } from "@/store/dashboard-store";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutDashboard } from "lucide-react";
import DashboardCard from "./DashboardCard";
// CardConfigModal will be created in a later step — TS error expected
import CardConfigModal from "./CardConfigModal";

export default function Canvas() {
  const { cards, reorderCards } = useDashboardStore();
  const [configuringCardId, setConfiguringCardId] = useState<string | null>(null);

  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cardIds.indexOf(active.id as string);
    const newIndex = cardIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderCards(oldIndex, newIndex);
    }
  }

  const configuringCard = configuringCardId
    ? cards.find((c) => c.id === configuringCardId) ?? null
    : null;

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <EmptyState
          icon={<LayoutDashboard className="size-8" />}
          title="No cards yet"
          description="Add cards using the toolbar above to start building your dashboard."
        />
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div
            className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 p-4 md:grid-cols-2"
          >
            {cards.map((card) => (
              <DashboardCard
                key={card.id}
                card={card}
                onConfigure={(id) => setConfiguringCardId(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {configuringCard && (
        <CardConfigModal
          card={configuringCard}
          open={configuringCardId !== null}
            onOpenChange={(open: boolean) => {
            if (!open) setConfiguringCardId(null);
          }}
        />
      )}
    </>
  );
}
