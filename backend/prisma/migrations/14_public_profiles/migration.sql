-- Add username column for public profile URLs (/u/:username)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
