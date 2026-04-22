import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma 7 removed `directUrl`; prisma.config.ts only drives CLI/migration
    // commands, so point its single `url` at the session-mode DIRECT_URL
    // (port 5432). Runtime PrismaClient uses its own adapter with DATABASE_URL
    // (pooler, port 6543).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    // Shadow DB for `prisma migrate dev`. Points at a separate Supabase project
    // (illumin-shadow) so Prisma can compute migration diffs without touching
    // production. Local dev only, never set in Vercel.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
