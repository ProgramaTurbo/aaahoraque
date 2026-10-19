import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// UNIVERSIDADES

export const universities = pgTable(
  "universities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officialName: varchar("official_name", { length: 255 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    city: varchar("city", { length: 150 }),
    officialCode: varchar("official_code", { length: 100 }),
    websiteUrl: text("website_url"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow().notNull(),
  }
);

// CENTROS ACADÉMICOS

export const academicCenters = pgTable(
  "academic_centers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "restrict" }),
    officialName: varchar("official_name", { length: 255 }).notNull(),
    officialCode: varchar("official_code", { length: 100 }),
    province: varchar("province", { length: 150 }),
  }
);

// TITULACIONES COMO CONCEPTO ACADÉMICO

export const degrees = pgTable(
  "degrees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    academicLevel: varchar("academic_level", { length: 50 }).notNull(),
    knowledgeArea: varchar("knowledge_area", { length: 150 }),
    description: text("description"),
  }
);

// OFERTA DE UNA TITULACIÓN EN UNA UNIVERSIDAD

export const degreeOfferings = pgTable(
  "degree_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    degreeId: uuid("degree_id")
      .notNull()
      .references(() => degrees.id, { onDelete: "restrict" }),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "restrict" }),
    academicCenterId: uuid("academic_center_id")
      .references(() => academicCenters.id, { onDelete: "restrict" }),
    modality: varchar("modality", { length: 50 }),
    officialReference: varchar("official_reference", { length: 150 }),
    sourceUrl: text("source_url"),
  }
);

// VERSIONES DE PLANES DE ESTUDIOS

export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    degreeOfferingId: uuid("degree_offering_id")
      .notNull()
      .references(() => degreeOfferings.id, { onDelete: "restrict" }),
    officialCode: varchar("official_code", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    implementationYear: integer("implementation_year"),
    totalEcts: numeric("total_ects", {
      precision: 6,
      scale: 2,
    }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    sourceUrl: text("source_url"),
  },
  (table) => [
    uniqueIndex("study_plans_offering_code_unique").on(
      table.degreeOfferingId,
      table.officialCode
    ),
  ]
);

// ASIGNATURAS DE CADA PLAN

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyPlanId: uuid("study_plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "restrict" }),
    officialCode: varchar("official_code", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    ects: numeric("ects", {
      precision: 5,
      scale: 2,
    }).notNull(),
    academicYear: integer("academic_year"),
    semester: varchar("semester", { length: 20 }),
    subjectType: varchar("subject_type", { length: 50 }),

    competencies: jsonb("competencies")
      .$type<string[]>().notNull().default([]),

    areaProfile: jsonb("area_profile")
      .$type<Record<string, number>>().notNull().default({}),

    professionalProfile: jsonb("professional_profile")
      .$type<Record<string, number>>().notNull().default({}),

    learningComponents: jsonb("learning_components")
      .$type<Record<string, number>>().notNull().default({}),

    estimatedDifficulty: numeric("estimated_difficulty", {
      precision: 4,
      scale: 2,
    }),
    estimatedWorkload: numeric("estimated_workload", {
      precision: 4,
      scale: 2,
    }),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>().notNull().default({}),

    sourceUrl: text("source_url"),
  },
  (table) => [
    uniqueIndex("subjects_plan_code_unique").on(
      table.studyPlanId,
      table.officialCode
    ),
  ]
);
