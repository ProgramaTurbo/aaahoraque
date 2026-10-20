CREATE TABLE "synthetic_academic_results" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"attempt" integer NOT NULL,
	"grade" numeric(4, 2) NOT NULL,
	"passed" boolean NOT NULL,
	"generator_version" varchar(40) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "synthetic_students" (
	"id" uuid PRIMARY KEY NOT NULL,
	"study_plan_id" uuid NOT NULL,
	"synthetic_code" varchar(50) NOT NULL,
	"admission_year" integer NOT NULL,
	"generator_version" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "synthetic_academic_results" ADD CONSTRAINT "synthetic_academic_results_student_id_synthetic_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."synthetic_students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_academic_results" ADD CONSTRAINT "synthetic_academic_results_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synthetic_students" ADD CONSTRAINT "synthetic_students_study_plan_id_study_plans_id_fk" FOREIGN KEY ("study_plan_id") REFERENCES "public"."study_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "synthetic_results_student_subject_unique" ON "synthetic_academic_results" USING btree ("student_id","subject_id");--> statement-breakpoint
CREATE INDEX "synthetic_results_subject_idx" ON "synthetic_academic_results" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "synthetic_results_year_idx" ON "synthetic_academic_results" USING btree ("academic_year");--> statement-breakpoint
CREATE UNIQUE INDEX "synthetic_students_code_unique" ON "synthetic_students" USING btree ("synthetic_code");--> statement-breakpoint
CREATE INDEX "synthetic_students_plan_idx" ON "synthetic_students" USING btree ("study_plan_id");