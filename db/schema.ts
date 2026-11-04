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
