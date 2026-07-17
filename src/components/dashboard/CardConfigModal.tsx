"use client";

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import { SEVERITY_LEVELS, SEVERITY_LABEL } from "@/lib/severity-color";
import type { SeverityLevel } from "@/lib/severity-color";
import type { DashboardCard, TableName } from "@/lib";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeverityBadge } from "@/components/ui/severity-badge";

// ── Constants ──────────────────────────────────────────────

const TABLE_NAMES: TableName[] = [
  "energy_consumption",
  "hvac_performance",
  "occupancy",
  "alerts_events",
];

const AGGREGATIONS = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count" },
] as const;

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "gte", label: "Greater Than or Equal" },
  { value: "lt", label: "Less Than" },
  { value: "lte", label: "Less Than or Equal" },
] as const;

// ── Types ──────────────────────────────────────────────────

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_numeric: boolean;
}

interface CardConfigModalProps {
  card: DashboardCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ────────────────────────────────────────────────

function capitalizeLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ── Component ──────────────────────────────────────────────

export default function CardConfigModal({
  card,
  open,
  onOpenChange,
}: CardConfigModalProps) {
  const { updateCardConfig } = useDashboardStore();
  const config = card.config;

  // ── Local form state ─────────────────────────────────────
  const [title, setTitle] = useState(config.title);
  const [dataSource, setDataSource] = useState("");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [aggregation, setAggregation] = useState(config.aggregation);
  const [groupBy, setGroupBy] = useState("");
  const [gaugeMin, setGaugeMin] = useState(config.gaugeMin ?? 0);
  const [gaugeMax, setGaugeMax] = useState(config.gaugeMax ?? 100);
  const [gaugeTarget, setGaugeTarget] = useState(config.gaugeTarget ?? 75);
  const [filterField, setFilterField] = useState("");
  const [filterOperator, setFilterOperator] = useState("eq");
  const [filterValue, setFilterValue] = useState("");

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  // ── Sync local state when dialog opens ──────────────────
  useEffect(() => {
    if (open) {
      setTitle(config.title);
      setDataSource(config.dataSource ?? "");
      setXAxis(config.xAxis?.field ?? "");
      setYAxis(config.yAxis?.field ?? "");
      setAggregation(config.aggregation);
      setGroupBy(config.groupBy?.field ?? "");
      setGaugeMin(config.gaugeMin ?? 0);
      setGaugeMax(config.gaugeMax ?? 100);
      setGaugeTarget(config.gaugeTarget ?? 75);
      setFilterField(config.filter?.field ?? "");
      setFilterOperator(config.filter?.operator ?? "eq");
      setFilterValue(config.filter?.value?.toString() ?? "");
    }
  }, [open, card.id]);

  // ── Fetch columns when data source changes ──────────────
  useEffect(() => {
    if (!dataSource) {
      setColumns([]);
      return;
    }
    setColumnsLoading(true);
    fetch(`/api/columns?source=${dataSource}`)
      .then((res) => res.json())
      .then((data) => {
        setColumns(data.columns ?? []);
      })
      .catch(() => {
        setColumns([]);
      })
      .finally(() => {
        setColumnsLoading(false);
      });
  }, [dataSource]);

  const numericColumns = columns.filter((c) => c.is_numeric);
  const stringColumns = columns.filter((c) => !c.is_numeric);

  // ── Actions ──────────────────────────────────────────────
  function handleSave() {
    updateCardConfig(card.id, {
      title,
      dataSource: (dataSource || null) as unknown as TableName,
      xAxis: xAxis
        ? { field: xAxis as never, label: capitalizeLabel(xAxis) }
        : null,
      yAxis: yAxis
        ? { field: yAxis as never, label: capitalizeLabel(yAxis) }
        : null,
      aggregation,
      groupBy: groupBy
        ? { field: groupBy as never, label: capitalizeLabel(groupBy) }
        : null,
      filter: filterField
        ? {
            field: filterField as never,
            operator: filterOperator as never,
            value: filterValue,
          }
        : null,
      ...(config.type === "gauge"
        ? {
            gaugeMin: Number(gaugeMin),
            gaugeMax: Number(gaugeMax),
            gaugeTarget: Number(gaugeTarget),
          }
        : {}),
    });
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  // ── Render ───────────────────────────────────────────────
  const typeLabel = capitalizeLabel(config.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure {typeLabel} Card</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {/* ── Card Title ────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="card-title">Card Title</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Card"
            />
          </div>

          {/* ── Data Source ───────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data-source">Data Source</Label>
            <Select
              value={dataSource}
              onValueChange={(value) => {
                setDataSource(value);
                // Reset axis selections when source changes
                setXAxis("");
                setYAxis("");
                setGroupBy("");
              }}
            >
              <SelectTrigger id="data-source" className="w-full">
                <SelectValue placeholder="Select a table..." />
              </SelectTrigger>
              <SelectContent>
                {TABLE_NAMES.map((table) => (
                  <SelectItem key={table} value={table}>
                    {capitalizeLabel(table)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Severity Legend (alerts_events only) ──────── */}
          {dataSource === "alerts_events" && (
            <div
              data-slot="severity-legend"
              className="flex flex-col gap-1.5 rounded-none border border-border bg-muted/40 p-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Alert severity colors
              </p>
              <div
                className="flex flex-wrap items-center gap-2"
                role="list"
                aria-label="Alert severity colors"
              >
                {SEVERITY_LEVELS.map((level: SeverityLevel) => (
                  <div
                    key={level}
                    role="listitem"
                    className="flex items-center gap-1.5"
                  >
                    <SeverityBadge level={level} />
                    <span className="text-xs text-muted-foreground">
                      {SEVERITY_LABEL[level]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Axis Configuration ────────────────────────── */}
          {dataSource && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="x-axis">X-Axis</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger id="x-axis" className="w-full">
                    <SelectValue
                      placeholder={
                        columnsLoading ? "Loading..." : "Select column..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.column_name} value={col.column_name}>
                        {col.column_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="y-axis">Y-Axis (Value)</Label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger id="y-axis" className="w-full">
                    <SelectValue
                      placeholder={
                        columnsLoading ? "Loading..." : "Select numeric column..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col.column_name} value={col.column_name}>
                        {col.column_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="aggregation">Aggregation</Label>
                <Select
                  value={aggregation}
                  onValueChange={(val) =>
                    setAggregation(val as typeof aggregation)
                  }
                >
                  <SelectTrigger id="aggregation" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((agg) => (
                      <SelectItem key={agg.value} value={agg.value}>
                        {agg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Group By (Line chart only) ────────────── */}
              {config.type === "line" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="group-by">
                    Group By <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger id="group-by" className="w-full">
                      <SelectValue placeholder="No grouping" />
                    </SelectTrigger>
                    <SelectContent>
                      {stringColumns.map((col) => (
                        <SelectItem key={col.column_name} value={col.column_name}>
                          {col.column_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ── Gauge Parameters ──────────────────────── */}
              {config.type === "gauge" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="gauge-min">Min</Label>
                    <Input
                      id="gauge-min"
                      type="number"
                      value={gaugeMin}
                      onChange={(e) => setGaugeMin(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="gauge-max">Max</Label>
                    <Input
                      id="gauge-max"
                      type="number"
                      value={gaugeMax}
                      onChange={(e) => setGaugeMax(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="gauge-target">Target</Label>
                    <Input
                      id="gauge-target"
                      type="number"
                      value={gaugeTarget}
                      onChange={(e) => setGaugeTarget(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* ── Optional Filter ───────────────────────── */}
              <fieldset className="rounded-none border border-input p-3">
                <legend className="px-1 text-xs font-medium text-muted-foreground">
                  Filter <span className="text-muted-foreground">(optional)</span>
                </legend>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter-field">Field</Label>
                    <Select value={filterField} onValueChange={setFilterField}>
                      <SelectTrigger id="filter-field" className="w-full">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stringColumns.map((col) => (
                          <SelectItem
                            key={col.column_name}
                            value={col.column_name}
                          >
                            {col.column_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter-operator">Operator</Label>
                    <Select
                      value={filterOperator}
                      onValueChange={setFilterOperator}
                    >
                      <SelectTrigger id="filter-operator" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter-value">Value</Label>
                    <Input
                      id="filter-value"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="Filter value"
                    />
                  </div>
                </div>
              </fieldset>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
