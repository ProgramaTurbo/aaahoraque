import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Identifica una descarga concreta de una fuente académica.
// No debe confundirse con un curso académico oficial.

export const catalogImportBatches = pgTable(
  "catalog_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    source: varchar("source", { length: 50 }).notNull(),

    fileName: varchar("file_name", { length: 255 }).notNull(),

    fileSha256: varchar("file_sha256", { length: 64 }).notNull(),

    sourceUrl: text("source_url"),

    referenceAcademicYear: varchar(
      "reference_academic_year",
      { length: 20 }
    ),

    rowCount: integer("row_count").notNull(),

    importedAt: timestamp("imported_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("catalog_import_batches_source_hash_unique").on(
      table.source,
      table.fileSha256
    ),
  ]
);

// Conserva íntegramente cada fila de la fuente original.
// Los duplicados no se eliminan en esta capa.

export const catalogImportRows = pgTable(
  "catalog_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    batchId: uuid("batch_id")
      .notNull()
      .references(() => catalogImportBatches.id, {
        onDelete: "restrict",
      }),

    rowNumber: integer("row_number").notNull(),

    rawData: jsonb("raw_data")
      .$type<Record<string, string>>()
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("catalog_import_rows_batch_row_unique").on(
      table.batchId,
      table.rowNumber
    ),
  ]
);
