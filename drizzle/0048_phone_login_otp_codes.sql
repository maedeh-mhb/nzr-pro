CREATE TABLE IF NOT EXISTS "phone_login_otp_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "phone" text NOT NULL,
  "otp_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "phone_login_otp_codes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_login_otp_codes_phone_created_at_idx"
  ON "phone_login_otp_codes" ("phone", "created_at");
