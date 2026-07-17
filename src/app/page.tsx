import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";
import { PrefetchedDashboard } from "./_prefetch";

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
