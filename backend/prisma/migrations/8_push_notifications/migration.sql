-- CreateEnum
CREATE TYPE "PushTokenType" AS ENUM ('WEB_PUSH', 'APNS', 'FCM');

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PushTokenType" NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "endpoint" TEXT,
    "p256dh" TEXT,
    "auth" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- Add notificationPreferences to users
ALTER TABLE "users" ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_userId_token_key" ON "push_tokens"("userId", "token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_isActive_idx" ON "push_tokens"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
