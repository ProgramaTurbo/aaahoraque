CREATE TABLE "qedu_offering_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"degree_offering_id" uuid NOT NULL,
	"identity_hash" varchar(64) NOT NULL,
	"foreign_language" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qedu_offering_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mapping_id" uuid NOT NULL,
	"import_row_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_centers" ADD COLUMN "province" varchar(150);--> statement-breakpoint
ALTER TABLE "qedu_offering_mappings" ADD CONSTRAINT "qedu_offering_mappings_batch_id_catalog_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."catalog_import_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qedu_offering_mappings" ADD CONSTRAINT "qedu_offering_mappings_degree_offering_id_degree_offerings_id_fk" FOREIGN KEY ("degree_offering_id") REFERENCES "public"."degree_offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qedu_offering_rows" ADD CONSTRAINT "qedu_offering_rows_mapping_id_qedu_offering_mappings_id_fk" FOREIGN KEY ("mapping_id") REFERENCES "public"."qedu_offering_mappings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qedu_offering_rows" ADD CONSTRAINT "qedu_offering_rows_import_row_id_catalog_import_rows_id_fk" FOREIGN KEY ("import_row_id") REFERENCES "public"."catalog_import_rows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qedu_mappings_batch_identity_unique" ON "qedu_offering_mappings" USING btree ("batch_id","identity_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "qedu_mappings_batch_offering_unique" ON "qedu_offering_mappings" USING btree ("batch_id","degree_offering_id");--> statement-breakpoint
CREATE UNIQUE INDEX "qedu_offering_rows_import_row_unique" ON "qedu_offering_rows" USING btree ("import_row_id");