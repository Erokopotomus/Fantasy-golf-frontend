-- Add lat/lon to courses for weather lookups
ALTER TABLE courses ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS longitude FLOAT;

-- Add unique constraint on weather for clean upserts (tournament + round)
CREATE UNIQUE INDEX IF NOT EXISTS "weather_tournament_round_key" ON weather("tournamentId", round);
