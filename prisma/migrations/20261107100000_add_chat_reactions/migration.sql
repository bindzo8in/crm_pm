CREATE TABLE "chat_message_reaction" (
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_reaction_pkey" PRIMARY KEY ("message_id", "user_id", "emoji")
);

CREATE INDEX "chat_message_reaction_user_id_idx" ON "chat_message_reaction"("user_id");

ALTER TABLE "chat_message_reaction" ADD CONSTRAINT "chat_message_reaction_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_message_reaction" ADD CONSTRAINT "chat_message_reaction_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
