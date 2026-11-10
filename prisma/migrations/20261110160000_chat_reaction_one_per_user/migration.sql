DELETE FROM "chat_message_reaction" AS older
USING "chat_message_reaction" AS newer
WHERE older."message_id" = newer."message_id"
  AND older."user_id" = newer."user_id"
  AND (
    older."created_at" > newer."created_at"
    OR (
      older."created_at" = newer."created_at"
      AND older."emoji" > newer."emoji"
    )
  );

ALTER TABLE "chat_message_reaction"
    DROP CONSTRAINT "chat_message_reaction_pkey";

ALTER TABLE "chat_message_reaction"
    ADD CONSTRAINT "chat_message_reaction_pkey"
    PRIMARY KEY ("message_id", "user_id");
