"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/dashboard-store";

export default function StoreInitializer() {
  const loadFromStorage = useDashboardStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return null;
}
