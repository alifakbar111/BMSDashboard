import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";
import GlobalFilters from "@/components/layout/GlobalFilters";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <CardPalette />
      <GlobalFilters />
      <Canvas />
    </main>
  );
}
