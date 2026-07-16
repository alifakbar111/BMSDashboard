# Task 1: Project Setup — Scaffold Next.js 16 + shadcn/ui + Dependencies + Git Init

## Context

Full-stack BMS Dashboard Builder. No app code exists yet. PNPM package manager.

## Steps

### 1. Create Next.js 16+ project with PNPM

```bash
pnpm create next-app@latest /home/al-ip/learning/BMS-Dashboard --typescript --tailwind --no-eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbo
```

### 2. Init shadcn/ui with user preset

```bash
cd /home/al-ip/learning/BMS-Dashboard
pnpm dlx shadcn@latest init --preset b7BEjszMO0 --base radix --template next
```

Accept defaults for all prompts.

### 3. Add required shadcn components

```bash
pnpm dlx shadcn@latest add button card dialog select tabs input label tooltip skeleton chart
```

### 4. Install remaining dependencies

```bash
pnpm add prisma @prisma/client @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand @tanstack/react-query date-fns lucide-react
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/node tsx oxlint oxfmt
```

### 5. Add scripts to package.json

Read package.json and add to "scripts":

```json
"lint": "oxlint .",
"format": "oxfmt .",
"test": "vitest run",
"test:watch": "vitest"
```

### 6. Create QueryProvider

File: `src/components/layout/QueryProvider.tsx`

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### 7. Create .gitignore

```
node_modules/
.next/
*.tsbuildinfo
next-env.d.ts
.env
.env.local
.env*.local
```

### 8. Verify globals.css has Tailwind + shadcn CSS variables

### 9. Create ThemeProvider if not exist

File: `src/components/layout/ThemeProvider.tsx`

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### 10. Write src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { QueryProvider } from "@/components/layout/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "BMS Dashboard",
  description: "Building Management System Dashboard Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 11. Write placeholder src/app/page.tsx

```tsx
export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">BMS Dashboard</h1>
      <p className="text-muted-foreground mt-2">Dashboard builder loading...</p>
    </main>
  );
}
```

### 12. Verify build

```bash
pnpm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

### 13. Git init + granular commits

```bash
git init
git branch -m main
git checkout -b phase/1-setup

# Commit 1: Pre-existing project assets
git add .agents/ .opencode/ .superpowers/ AGENTS.md TechnicalTest/ data/ docs/ opencode.json skills-lock.json components.json
git commit -m "chore(repo): add project specification, data files, and agent configuration"

# Commit 2: Next.js scaffold
git add next.config.ts tsconfig.json postcss.config.mjs package.json pnpm-lock.yaml prisma/ public/ src/app/favicon.ico src/app/globals.css src/lib/
git commit -m "chore(project): scaffold Next.js 16 with TypeScript, Tailwind, and Turbopack"

# Commit 3: shadcn UI components
git add src/components/ui/
git commit -m "chore(ui): add shadcn/ui preset and components (button, card, dialog, select, tabs, input, label, tooltip, skeleton, chart)"

# Commit 4: Custom providers + layout
git add src/app/layout.tsx src/app/page.tsx src/components/layout/
git commit -m "feat(web): add QueryProvider, ThemeProvider, and root layout with dark mode"

# Commit 5: Config
git add .gitignore
git commit -m "chore(project): add .gitignore for Node.js, Next.js, and environment files"
```

## Expected Output

- Working Next.js 16 + shadcn/ui project
- TanStack Query + oxlint/oxfmt installed
- All dependencies installed
- Git: main + phase/1-setup branches
- **5 granular commits** (not one big lump):

  | #   | Commit message                              | Files                  |
  | --- | ------------------------------------------- | ---------------------- |
  | 1   | `chore(repo): add project specification...` | Pre-existing assets    |
  | 2   | `chore(project): scaffold Next.js 16...`    | create-next-app output |
  | 3   | `chore(ui): add shadcn/ui preset...`        | UI components          |
  | 4   | `feat(web): add QueryProvider...`           | Layout + providers     |
  | 5   | `chore(project): add .gitignore...`         | Config                 |

## Report

Write to `.superpowers/sdd/task-1-report.md`: status, commits, build output, branch name, concerns
