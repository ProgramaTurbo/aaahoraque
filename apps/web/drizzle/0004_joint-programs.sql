CREATE TABLE "joint_program_degrees" (
	"joint_program_id" uuid NOT NULL,
	"degree_id" uuid NOT NULL,
	"academic_center_id" uuid NOT NULL,
	CONSTRAINT "joint_program_degrees_joint_program_id_degree_id_academic_center_id_pk" PRIMARY KEY("joint_program_id","degree_id","academic_center_id")
);
--> statement-breakpoint
CREATE TABLE "joint_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_plans" ALTER COLUMN "degree_offering_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "study_plans" ADD COLUMN "joint_program_id" uuid;--> statement-breakpoint
ALTER TABLE "joint_program_degrees" ADD CONSTRAINT "joint_program_degrees_joint_program_id_joint_programs_id_fk" FOREIGN KEY ("joint_program_id") REFERENCES "public"."joint_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joint_program_degrees" ADD CONSTRAINT "joint_program_degrees_degree_id_degrees_id_fk" FOREIGN KEY ("degree_id") REFERENCES "public"."degrees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joint_program_degrees" ADD CONSTRAINT "joint_program_degrees_academic_center_id_academic_centers_id_fk" FOREIGN KEY ("academic_center_id") REFERENCES "public"."academic_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joint_programs" ADD CONSTRAINT "joint_programs_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_joint_program_id_joint_programs_id_fk" FOREIGN KEY ("joint_program_id") REFERENCES "public"."joint_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_plans_joint_program_code_unique" ON "study_plans" USING btree ("joint_program_id","official_code");--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_exactly_one_parent" CHECK (num_nonnulls("study_plans"."degree_offering_id", "study_plans"."joint_program_id") = 1);