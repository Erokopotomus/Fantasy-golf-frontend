-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PushTokenType" AS ENUM ('WEB_PUSH', 'APNS', 'FCM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_tokens" (
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
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_userId_token_key" ON "push_tokens"("userId", "token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_tokens_userId_isActive_idx" ON "push_tokens"("userId", "isActive");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
