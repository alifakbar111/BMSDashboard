import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";
import { PrefetchedDashboard } from "./_prefetch";

// Skip static export — the prefetch requires live /api/query and a running
// SQL Server, neither of which is available in the build sandbox. Render on
// demand. The floor-plan page sets the same directive for the same reason.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <PrefetchedDashboard>
      <main className="flex min-h-screen flex-col">
        <CardPalette />
        <Canvas />
      </main>
    </PrefetchedDashboard>
  );
}
