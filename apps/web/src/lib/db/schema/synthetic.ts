
import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { studyPlans, subjects } from "./catalog";

// Estudiantes exclusivamente sintéticos.
// No almacena datos personales de alumnos reales.
export const syntheticStudents = pgTable(
  "synthetic_students",
  {
    id: uuid("id").primaryKey(),

    studyPlanId: uuid("study_plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "restrict" }),

    syntheticCode: varchar("synthetic_code", {
      length: 50,
    }).notNull(),

    admissionYear: integer("admission_year").notNull(),

    generatorVersion: varchar("generator_version", {
      length: 40,
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("synthetic_students_code_unique")
      .on(table.syntheticCode),

    index("synthetic_students_plan_idx")
      .on(table.studyPlanId),
  ]
);

// Resultados académicos generados artificialmente.
export const syntheticAcademicResults = pgTable(
  "synthetic_academic_results",
  {
    id: uuid("id").primaryKey(),

    studentId: uuid("student_id")
      .notNull()
      .references(() => syntheticStudents.id, {
        onDelete: "restrict",
      }),

    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, {
        onDelete: "restrict",
      }),

    academicYear: varchar("academic_year", {
      length: 9,
    }).notNull(),

    attempt: integer("attempt").notNull(),

    grade: numeric("grade", {
      precision: 4,
      scale: 2,
    }).notNull(),

    passed: boolean("passed").notNull(),

    generatorVersion: varchar("generator_version", {
      length: 40,
    }).notNull(),
  },
  (table) => [
    uniqueIndex("synthetic_results_student_subject_unique")
      .on(table.studentId, table.subjectId),

    index("synthetic_results_subject_idx")
      .on(table.subjectId),

    index("synthetic_results_year_idx")
      .on(table.academicYear),
  ]
);

