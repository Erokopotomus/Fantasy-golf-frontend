-- Add hourly weather data
ALTER TABLE "weather" ADD COLUMN "hourlyData" JSONB;
