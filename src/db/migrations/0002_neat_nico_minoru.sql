CREATE TABLE "user_subscriptions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" varchar(20) DEFAULT 'free' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscriptions_tier_check" CHECK ("user_subscriptions"."tier" IN ('free','premium','premium_plus'))
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "user_subscriptions" ("user_id", "tier")
SELECT "id", 'free' FROM "user"
ON CONFLICT ("user_id") DO NOTHING;