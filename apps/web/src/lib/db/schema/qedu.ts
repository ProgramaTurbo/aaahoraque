import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { degreeOfferings } from "./catalog";
import {
  catalogImportBatches,
  catalogImportRows,
} from "./imports";

// Correspondencia entre una oferta QEDU identificada
// provisionalmente y una oferta del catálogo compartido.
//
// identityHash NO es un código oficial del RUCT.

export const qeduOfferingMappings = pgTable(
  "qedu_offering_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    batchId: uuid("batch_id")
      .notNull()
      .references(() => catalogImportBatches.id, {
        onDelete: "restrict",
      }),

    degreeOfferingId: uuid("degree_offering_id")
      .notNull()
      .references(() => degreeOfferings.id, {
        onDelete: "restrict",
      }),

    identityHash: varchar("identity_hash", {
      length: 64,
    }).notNull(),

    foreignLanguage: boolean("foreign_language").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("qedu_mappings_batch_identity_unique").on(
      table.batchId,
      table.identityHash
    ),

    uniqueIndex("qedu_mappings_batch_offering_unique").on(
      table.batchId,
      table.degreeOfferingId
    ),
  ]
);

// Cada registro original queda vinculado explícitamente
// a la oferta QEDU a la que pertenece.
//
// Esto preserva duplicados y discrepancias de la fuente.

export const qeduOfferingRows = pgTable(
  "qedu_offering_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    mappingId: uuid("mapping_id")
      .notNull()
      .references(() => qeduOfferingMappings.id, {
        onDelete: "restrict",
      }),

    importRowId: uuid("import_row_id")
      .notNull()
      .references(() => catalogImportRows.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [
    uniqueIndex("qedu_offering_rows_import_row_unique").on(
      table.importRowId
    ),
  ]
);
