import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Period } from "@/lib/subjects/decision";
import type { SubjectPreferences } from "@/lib/subjects/progress";
import { authUsers } from "./account";
import { degreeOfferings, studyPlans, subjects } from "./catalog";

export const studentDecisionPlans = pgTable("student_decision_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => studyPlans.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["draft", "scenario"] }).notNull(),
  name: text("name"),
  period: text("period").$type<Period>().notNull(),
  target: integer("target").notNull(),
  subjectIds: uuid("subject_ids").array().notNull(),
  preferences: jsonb("preferences").$type<SubjectPreferences>(),
  version: integer("version").default(1).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("student_decisions_user_plan_idx").on(t.userId, t.planId),
  uniqueIndex("student_decisions_single_draft").on(t.userId, t.planId).where(sql`${t.kind} = 'draft'`),
  check("student_decisions_kind_check", sql`(${t.kind} = 'draft' AND ${t.name} IS NULL AND ${t.preferences} IS NULL)
    OR (${t.kind} = 'scenario' AND ${t.name} IS NOT NULL AND ${t.preferences} IS NOT NULL)`),
  check("student_decisions_period_check", sql`${t.period} IN ('1', '2', 'annual')`),
  check("student_decisions_target_check", sql`${t.target} BETWEEN 1 AND 120`),
]);

export const studentFavorites = pgTable("student_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  offeringId: uuid("offering_id").references(() => degreeOfferings.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
  destination: text("destination"),
  destinationUrl: text("destination_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("student_favorites_user_idx").on(t.userId),
  uniqueIndex("student_favorites_offering_unique").on(t.userId, t.offeringId),
  uniqueIndex("student_favorites_subject_unique").on(t.userId, t.subjectId),
  uniqueIndex("student_favorites_destination_unique").on(t.userId, sql`lower(${t.destination})`),
  check("student_favorites_target_check", sql`num_nonnulls(${t.offeringId}, ${t.subjectId}, ${t.destination}) = 1
    AND (${t.destination} IS NOT NULL OR ${t.destinationUrl} IS NULL)`),
]);
