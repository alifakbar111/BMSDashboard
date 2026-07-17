"use client";

import { useRef } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  Plus,
  BarChart3,
  Activity,
  Gauge,
  Hash,
  Download,
  Upload,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardType } from "@/lib";

const CARD_TYPES: { type: CardType; label: string; icon: typeof Plus }[] = [
  { type: "kpi", label: "KPI", icon: Hash },
  { type: "bar", label: "Bar Chart", icon: BarChart3 },
  { type: "line", label: "Line Chart", icon: Activity },
  { type: "gauge", label: "Gauge", icon: Gauge },
];

export default function CardPalette() {
  const { cards, addCard, setCards } = useDashboardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob(
      [JSON.stringify({ cards, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bms-dashboard-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.cards)) {
          setCards(data.cards);
        } else if (Array.isArray(data)) {
          setCards(data);
        }
      } catch {
        // Invalid file — silently ignore
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="card-palette flex items-center gap-2 border-b p-4">
      {CARD_TYPES.map(({ type, label, icon: Icon }) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={() => addCard(type)}
          aria-label={`Add ${label} card`}
        >
          <Icon className="size-4" />
          {label}
        </Button>
      ))}

      <div className="no-print ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleExport}
          aria-label="Export dashboard layout"
        >
          <Download className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import dashboard layout"
        >
          <Upload className="size-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
          aria-hidden="true"
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => window.print()}
          aria-label="Print dashboard"
        >
          <Printer className="size-4" />
        </Button>
      </div>
    </div>
  );
}
