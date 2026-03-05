-- CreateTable
CREATE TABLE "draft_chat_messages" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "draft_chat_messages_draftId_createdAt_idx" ON "draft_chat_messages"("draftId", "createdAt");

-- AddForeignKey
ALTER TABLE "draft_chat_messages" ADD CONSTRAINT "draft_chat_messages_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
