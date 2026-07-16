import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold">BMS Dashboard</h1>
      <p className="text-muted-foreground mt-2">Dashboard builder loading...</p>
      <Button className="mt-4" disabled>
        Get Started
      </Button>
    </main>
  );
}
