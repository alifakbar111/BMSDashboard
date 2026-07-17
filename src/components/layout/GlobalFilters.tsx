"use client";

import { useDashboardStore } from "@/store/dashboard-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BUILDINGS = ["BLD-001", "BLD-002"];
const FLOORS = [1, 2];

const TIME_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "custom", label: "Custom Range" },
] as const;

export default function GlobalFilters() {
  const { cards, filters, setFilters } = useDashboardStore();

  return (
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
      {/* Building */}
      <div className="flex items-center gap-2">
        <Label htmlFor="building-filter" className="text-xs text-muted-foreground">
          Building
        </Label>
        <Select
          value={filters.buildingId ?? "all"}
          onValueChange={(val) =>
            setFilters({ buildingId: val === "all" ? null : val })
          }
        >
          <SelectTrigger id="building-filter" className="w-28">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {BUILDINGS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Floor */}
      <div className="flex items-center gap-2">
        <Label htmlFor="floor-filter" className="text-xs text-muted-foreground">
          Floor
        </Label>
        <Select
          value={filters.floor !== null ? String(filters.floor) : "all"}
          onValueChange={(val) =>
            setFilters({ floor: val === "all" ? null : Number(val) })
          }
        >
          <SelectTrigger id="floor-filter" className="w-24">
            <SelectValue placeholder="All Floors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {FLOORS.map((f) => (
              <SelectItem key={f} value={String(f)}>
                Floor {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Range */}
      <div className="flex items-center gap-2">
        <Label htmlFor="time-filter" className="text-xs text-muted-foreground">
          Time
        </Label>
        <Select
          value={filters.timeRange ?? "all"}
          onValueChange={(val) =>
            setFilters({ timeRange: val === "all" ? null : (val as typeof filters.timeRange) })
          }
        >
          <SelectTrigger id="time-filter" className="w-32">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date range (shown when "Custom Range" is selected) */}
      {filters.timeRange === "custom" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="custom-start" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="custom-start"
              type="date"
              className="h-7 w-36"
              value={
                filters.customStart
                  ? filters.customStart.slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                setFilters({
                  customStart: val ? new Date(val + "T00:00:00").toISOString() : null,
                });
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label htmlFor="custom-end" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="custom-end"
              type="date"
              className="h-7 w-36"
              value={
                filters.customEnd
                  ? filters.customEnd.slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value;
                setFilters({
                  customEnd: val ? new Date(val + "T00:00:00").toISOString() : null,
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Card count */}
      <div className="ml-auto text-xs text-muted-foreground">
        {cards.length} {cards.length === 1 ? "card" : "cards"}
      </div>
    </div>
  );
}
