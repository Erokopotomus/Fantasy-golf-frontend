-- Migration 40: Add isActive flag to owner_aliases
-- Allows commissioners to mark managers as active/inactive for record filtering

ALTER TABLE "owner_aliases" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
