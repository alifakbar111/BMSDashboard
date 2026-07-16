import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const server = connectionUrl.match(/sqlserver:\/\/([^:;]+)/)?.[1] ?? "localhost";
const port = parseInt(connectionUrl.match(/:(\d+);/)?.[1] ?? "1433", 10);

const getParam = (url: string, key: string): string => {
  const match = url.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : "";
};

const adapter = new PrismaMssql({
  server,
  port,
  database: getParam(connectionUrl, "database") || "bms_dashboard",
  user: getParam(connectionUrl, "user") || "SA",
  password: getParam(connectionUrl, "password"),
  options: {
    encrypt: getParam(connectionUrl, "encrypt") === "true",
    trustServerCertificate: getParam(connectionUrl, "trustServerCertificate") !== "false",
  },
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
