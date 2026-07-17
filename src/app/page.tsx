import CardPalette from "@/components/dashboard/CardPalette";
import Canvas from "@/components/dashboard/Canvas";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <CardPalette />
      <Canvas />
    </main>
  );
}
