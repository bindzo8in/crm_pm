CREATE TABLE "salary_pin" (
    "user_id" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_reset_requested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_pin_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "salary_pin_reset_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_pin_reset_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salary_pin_reset_token_token_hash_key"
ON "salary_pin_reset_token"("token_hash");

CREATE INDEX "salary_pin_reset_token_user_id_idx"
ON "salary_pin_reset_token"("user_id");

CREATE INDEX "salary_pin_reset_token_expires_at_idx"
ON "salary_pin_reset_token"("expires_at");

ALTER TABLE "salary_pin"
ADD CONSTRAINT "salary_pin_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "salary_pin_reset_token"
ADD CONSTRAINT "salary_pin_reset_token_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
