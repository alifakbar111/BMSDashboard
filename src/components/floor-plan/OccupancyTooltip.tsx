import { cn } from "@/lib/utils";

export interface ZoneData {
  zone: string;
  floor: number;
  zoneCapacity?: number | null;
  personCount?: number | null;
  occupancyRatePercent?: number | null;
  co2Ppm?: number | null;
  temperatureC?: number | null;
  humidityPercent?: number | null;
  airQualityIndex?: number | null;
  entryCount?: number | null;
  exitCount?: number | null;
  timestamp?: string | null;
}

interface OccupancyTooltipProps {
  data: ZoneData;
  pageX: number;
  pageY: number;
}

function OccupancyTooltip({ data, pageX, pageY }: OccupancyTooltipProps) {
  const occupancy = data.occupancyRatePercent ?? null;
  const people = data.personCount ?? null;
  const capacity = data.zoneCapacity ?? null;
  const co2 = data.co2Ppm ?? null;
  const aqi = data.airQualityIndex ?? null;
  const hasData = data.timestamp != null;
  const updated = hasData ? new Date(data.timestamp!).toLocaleString() : "—";

  return (
    <div
      data-slot="occupancy-tooltip"
      className={cn(
        "pointer-events-none fixed z-50 w-56 border bg-card p-3 text-card-foreground shadow-lg",
      )}
      style={{ left: pageX + 12, top: pageY - 10 }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="font-heading text-sm font-semibold">{data.zone}</p>
        {!hasData && (
          <span className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            No data
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <tbody>
          <tr>
            <td className="pr-3 text-muted-foreground">Floor</td>
            <td className="text-right font-medium">{data.floor}</td>
          </tr>
          <tr>
            <td className="pr-3 text-muted-foreground">Occupancy</td>
            <td className="text-right font-medium">
              {occupancy !== null ? `${occupancy}%` : "—"}
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-muted-foreground">People</td>
            <td className="text-right font-medium">
              {people !== null && capacity !== null
                ? `${people} / ${capacity}`
                : "—"}
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-muted-foreground">CO₂</td>
            <td className="text-right font-medium">
              {co2 !== null ? `${co2} ppm` : "—"}
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-muted-foreground">AQI</td>
            <td className="text-right font-medium">
              {aqi !== null ? aqi : "—"}
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-muted-foreground">Updated</td>
            <td className="text-right font-medium">{updated}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export { OccupancyTooltip };
