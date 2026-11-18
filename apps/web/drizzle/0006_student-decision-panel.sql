CREATE TABLE "student_decision_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"period" text NOT NULL,
	"target" integer NOT NULL,
	"subject_ids" uuid[] NOT NULL,
	"preferences" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_decisions_kind_check" CHECK (("student_decision_plans"."kind" = 'draft' AND "student_decision_plans"."name" IS NULL AND "student_decision_plans"."preferences" IS NULL)
    OR ("student_decision_plans"."kind" = 'scenario' AND "student_decision_plans"."name" IS NOT NULL AND "student_decision_plans"."preferences" IS NOT NULL)),
	CONSTRAINT "student_decisions_period_check" CHECK ("student_decision_plans"."period" IN ('1', '2', 'annual')),
	CONSTRAINT "student_decisions_target_check" CHECK ("student_decision_plans"."target" BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE TABLE "student_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"offering_id" uuid,
	"subject_id" uuid,
	"destination" text,
	"destination_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_favorites_target_check" CHECK (num_nonnulls("student_favorites"."offering_id", "student_favorites"."subject_id", "student_favorites"."destination") = 1
    AND ("student_favorites"."destination" IS NOT NULL OR "student_favorites"."destination_url" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "student_plan_progress" ADD COLUMN "last_section" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "decision_goal" text;--> statement-breakpoint
ALTER TABLE "student_decision_plans" ADD CONSTRAINT "student_decision_plans_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_decision_plans" ADD CONSTRAINT "student_decision_plans_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_favorites" ADD CONSTRAINT "student_favorites_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_favorites" ADD CONSTRAINT "student_favorites_offering_id_degree_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."degree_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_favorites" ADD CONSTRAINT "student_favorites_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_decisions_user_plan_idx" ON "student_decision_plans" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_decisions_single_draft" ON "student_decision_plans" USING btree ("user_id","plan_id") WHERE "student_decision_plans"."kind" = 'draft';--> statement-breakpoint
CREATE INDEX "student_favorites_user_idx" ON "student_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_favorites_offering_unique" ON "student_favorites" USING btree ("user_id","offering_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_favorites_subject_unique" ON "student_favorites" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_favorites_destination_unique" ON "student_favorites" USING btree ("user_id",lower("destination"));