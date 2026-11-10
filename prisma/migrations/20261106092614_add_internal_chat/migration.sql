-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PROJECT', 'DIRECT');

-- CreateEnum
CREATE TYPE "ChatAttachmentResourceType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'RAW');

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "projectId" TEXT,
    "directKey" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_member" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_member_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "replyToId" TEXT,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_attachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "resource_type" "ChatAttachmentResourceType" NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "thumbnail_url" TEXT,
    "thumbnail_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_projectId_key" ON "conversation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_directKey_key" ON "conversation"("directKey");

-- CreateIndex
CREATE INDEX "conversation_type_updatedAt_idx" ON "conversation"("type", "updatedAt");

-- CreateIndex
CREATE INDEX "conversation_member_userId_conversationId_idx" ON "conversation_member"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "chat_message_conversation_id_created_at_idx" ON "chat_message"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_message_sender_id_created_at_idx" ON "chat_message"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_message_replyToId_idx" ON "chat_message"("replyToId");

-- CreateIndex
CREATE INDEX "chat_message_attachment_message_id_created_at_idx" ON "chat_message_attachment"("message_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_message_attachment_public_id_idx" ON "chat_message_attachment"("public_id");

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_attachment" ADD CONSTRAINT "chat_message_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
