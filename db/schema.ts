import type { TaskCoverage } from "../lib/calendar";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(),
  editTokenHash: text("edit_token_hash").notNull(),
  days: text("days", { mode: "json" }).$type<string[]>().notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const responsibilities = sqliteTable("responsibilities", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").references(() => responses.id),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  notes: text("notes").notNull().default(""),
  coverage: text("coverage", { mode: "json" }).$type<TaskCoverage[]>().notNull().default(sql`'[]'`),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});
