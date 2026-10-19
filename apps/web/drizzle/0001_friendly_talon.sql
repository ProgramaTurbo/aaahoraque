CREATE TABLE "catalog_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_sha256" varchar(64) NOT NULL,
	"source_url" text,
	"reference_academic_year" varchar(20),
	"row_count" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_import_rows" ADD CONSTRAINT "catalog_import_rows_batch_id_catalog_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."catalog_import_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_import_batches_source_hash_unique" ON "catalog_import_batches" USING btree ("source","file_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_import_rows_batch_row_unique" ON "catalog_import_rows" USING btree ("batch_id","row_number");