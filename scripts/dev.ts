#!/usr/bin/env tsx
/**
 * dev.ts — Thin wrapper around `next dev` that prints the docs URL
 * alongside the standard startup banner.
 *
 * Usage: pnpm dev  (or: tsx scripts/dev.ts)
 */

import { spawn } from "node:child_process";

const next = spawn("next", ["dev"], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: true,
});

let docsPrinted = false;

next.stdout.on("data", (data: Buffer) => {
  const text = data.toString();
  process.stdout.write(text);

  // Print docs URL right after Next.js prints its Local/Network lines
  if (!docsPrinted && (text.includes("Local:") || text.includes("ready"))) {
    docsPrinted = true;
    setTimeout(() => {
      const docsLine = "  docs:         http://localhost:3000/docs\n";
      process.stdout.write(`\x1b[2m${docsLine}\x1b[22m`);
    }, 100);
  }
});

next.on("exit", (code: number | null) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  next.kill("SIGINT");
});

process.on("SIGTERM", () => {
  next.kill("SIGTERM");
});
