"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/floor-plan", label: "Floor Plan", icon: Map },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* BMS Logo/Brand */}
      <Link href="/" className="mr-4 flex items-center gap-2" aria-label="Home">
        <div className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
          BMS
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Button key={href} variant={isActive ? "secondary" : "ghost"} size="sm" asChild>
              <Link href={href} aria-current={isActive ? "page" : undefined}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <ThemeToggle />
    </header>
  );
}
