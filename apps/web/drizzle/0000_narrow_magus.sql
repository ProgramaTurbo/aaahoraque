CREATE TABLE "academic_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"official_name" varchar(255) NOT NULL,
	"official_code" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "degree_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"degree_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"academic_center_id" uuid,
	"modality" varchar(50),
	"official_reference" varchar(150),
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "degrees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"academic_level" varchar(50) NOT NULL,
	"knowledge_area" varchar(150),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"degree_offering_id" uuid NOT NULL,
	"official_code" varchar(100),
	"name" varchar(255) NOT NULL,
	"implementation_year" integer,
	"total_ects" numeric(6, 2) NOT NULL,
	"status" varchar(30) NOT NULL,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_plan_id" uuid NOT NULL,
	"official_code" varchar(100),
	"name" varchar(255) NOT NULL,
	"ects" numeric(5, 2) NOT NULL,
	"academic_year" integer,
	"semester" varchar(20),
	"subject_type" varchar(50),
	"competencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"area_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"professional_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"learning_components" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated_difficulty" numeric(4, 2),
	"estimated_workload" numeric(4, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_url" text
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"official_name" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"city" varchar(150),
	"official_code" varchar(100),
	"website_url" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_centers" ADD CONSTRAINT "academic_centers_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_offerings" ADD CONSTRAINT "degree_offerings_degree_id_degrees_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."degrees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_offerings" ADD CONSTRAINT "degree_offerings_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_offerings" ADD CONSTRAINT "degree_offerings_academic_center_id_academic_centers_id_fk" FOREIGN KEY ("academic_center_id") REFERENCES "public"."academic_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_degree_offering_id_degree_offerings_id_fk" FOREIGN KEY ("degree_offering_id") REFERENCES "public"."degree_offerings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_plans_offering_code_unique" ON "study_plans" USING btree ("degree_offering_id","official_code");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_plan_code_unique" ON "subjects" USING btree ("study_plan_id","official_code");