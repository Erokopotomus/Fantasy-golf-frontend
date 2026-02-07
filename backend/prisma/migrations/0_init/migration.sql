-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeagueFormat" AS ENUM ('FULL_LEAGUE', 'HEAD_TO_HEAD', 'ROTO', 'SURVIVOR', 'ONE_AND_DONE');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('SNAKE', 'AUCTION', 'NONE');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('DRAFT_PENDING', 'DRAFTING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('STROKE', 'MATCH', 'TEAM', 'STABLEFORD', 'MODIFIED_STABLEFORD');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'VETOED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "FantasyWeekStatus" AS ENUM ('UPCOMING', 'LOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LeagueSeasonStatus" AS ENUM ('ACTIVE', 'PLAYOFFS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchResult" AS ENUM ('WIN', 'LOSS', 'TIE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DRAFT_PICK', 'WAIVER_CLAIM', 'FREE_AGENT_ADD', 'FREE_AGENT_DROP', 'TRADE_ACQUIRED', 'TRADE_SENT', 'COMMISSIONER_ADD', 'COMMISSIONER_DROP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL DEFAULT 'GOLF',
    "format" "LeagueFormat" NOT NULL DEFAULT 'FULL_LEAGUE',
    "draftType" "DraftType" NOT NULL DEFAULT 'SNAKE',
    "status" "LeagueStatus" NOT NULL DEFAULT 'DRAFT_PENDING',
    "inviteCode" TEXT NOT NULL,
    "maxTeams" INTEGER NOT NULL DEFAULT 10,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sportId" TEXT,
    "scoringSystemId" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_members" (
    "id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "avatarUrl" TEXT,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_entries" (
    "id" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'BENCH',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquiredVia" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "droppedAt" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "roster_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "datagolfId" TEXT,
    "pgaTourId" TEXT,
    "sportRadarId" TEXT,
    "draftKingsId" TEXT,
    "fanDuelId" TEXT,
    "yahooId" TEXT,
    "espnId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "countryFlag" TEXT,
    "birthCity" TEXT,
    "birthState" TEXT,
    "birthDate" TIMESTAMP(3),
    "college" TEXT,
    "turnedPro" INTEGER,
    "pgaDebut" INTEGER,
    "weight" INTEGER,
    "height" TEXT,
    "swings" TEXT,
    "headshotUrl" TEXT,
    "headshotBgUrl" TEXT,
    "headshotNoBgUrl" TEXT,
    "owgr" DOUBLE PRECISION,
    "owgrRank" INTEGER,
    "fedexRank" INTEGER,
    "fedexPoints" DOUBLE PRECISION,
    "datagolfRank" INTEGER,
    "datagolfSkill" DOUBLE PRECISION,
    "events" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "top5s" INTEGER NOT NULL DEFAULT 0,
    "top10s" INTEGER NOT NULL DEFAULT 0,
    "top25s" INTEGER NOT NULL DEFAULT 0,
    "cutsMade" INTEGER NOT NULL DEFAULT 0,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "scoringAvg" DOUBLE PRECISION,
    "adjustedScoringAvg" DOUBLE PRECISION,
    "birdieAvg" DOUBLE PRECISION,
    "eaglesTotal" INTEGER NOT NULL DEFAULT 0,
    "holesInOne" INTEGER NOT NULL DEFAULT 0,
    "bogeyFreeRounds" INTEGER NOT NULL DEFAULT 0,
    "sgTotal" DOUBLE PRECISION,
    "sgPutting" DOUBLE PRECISION,
    "sgAroundGreen" DOUBLE PRECISION,
    "sgApproach" DOUBLE PRECISION,
    "sgOffTee" DOUBLE PRECISION,
    "sgTeeToGreen" DOUBLE PRECISION,
    "sgBallStriking" DOUBLE PRECISION,
    "drivingDistance" DOUBLE PRECISION,
    "drivingAccuracy" DOUBLE PRECISION,
    "gir" DOUBLE PRECISION,
    "scrambling" DOUBLE PRECISION,
    "sandSaves" DOUBLE PRECISION,
    "puttsPerRound" DOUBLE PRECISION,
    "onePointPercentage" DOUBLE PRECISION,
    "threePointPercentage" DOUBLE PRECISION,
    "proximityOverall" DOUBLE PRECISION,
    "proximityFairway" DOUBLE PRECISION,
    "proximityRough" DOUBLE PRECISION,
    "goodShotPct" DOUBLE PRECISION,
    "poorShotPct" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAmateur" BOOLEAN NOT NULL DEFAULT false,
    "primaryTour" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "timezone" TEXT,
    "par" INTEGER,
    "yardage" INTEGER,
    "grassType" TEXT,
    "greenSpeed" DOUBLE PRECISION,
    "elevation" INTEGER,
    "architect" TEXT,
    "yearBuilt" INTEGER,
    "drivingImportance" DOUBLE PRECISION,
    "approachImportance" DOUBLE PRECISION,
    "aroundGreenImportance" DOUBLE PRECISION,
    "puttingImportance" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "yardage" INTEGER,
    "handicap" INTEGER,
    "description" TEXT,

    CONSTRAINT "holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "datagolfId" TEXT,
    "espnEventId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "courseId" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "purse" DOUBLE PRECISION,
    "winnerShare" DOUBLE PRECISION,
    "fedexPoints" DOUBLE PRECISION,
    "owgrPoints" DOUBLE PRECISION,
    "format" "TournamentFormat" NOT NULL DEFAULT 'STROKE',
    "tour" TEXT,
    "isMajor" BOOLEAN NOT NULL DEFAULT false,
    "isPlayoff" BOOLEAN NOT NULL DEFAULT false,
    "isSignature" BOOLEAN NOT NULL DEFAULT false,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "cutLine" INTEGER,
    "isWeatherDelay" BOOLEAN NOT NULL DEFAULT false,
    "fieldSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performances" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" INTEGER,
    "positionTied" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "totalScore" INTEGER,
    "totalToPar" INTEGER,
    "round1" INTEGER,
    "round2" INTEGER,
    "round3" INTEGER,
    "round4" INTEGER,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fedexPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "owgrPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fantasyPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dkPoints" DOUBLE PRECISION,
    "fdPoints" DOUBLE PRECISION,
    "yahooPoints" DOUBLE PRECISION,
    "eagles" INTEGER NOT NULL DEFAULT 0,
    "birdies" INTEGER NOT NULL DEFAULT 0,
    "pars" INTEGER NOT NULL DEFAULT 0,
    "bogeys" INTEGER NOT NULL DEFAULT 0,
    "doubleBogeys" INTEGER NOT NULL DEFAULT 0,
    "worseThanDouble" INTEGER NOT NULL DEFAULT 0,
    "sgTotal" DOUBLE PRECISION,
    "sgPutting" DOUBLE PRECISION,
    "sgAroundGreen" DOUBLE PRECISION,
    "sgApproach" DOUBLE PRECISION,
    "sgOffTee" DOUBLE PRECISION,
    "sgTeeToGreen" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_scores" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "score" INTEGER,
    "toPar" INTEGER,
    "teeTime" TIMESTAMP(3),
    "startingHole" INTEGER NOT NULL DEFAULT 1,
    "eagles" INTEGER NOT NULL DEFAULT 0,
    "birdies" INTEGER NOT NULL DEFAULT 0,
    "pars" INTEGER NOT NULL DEFAULT 0,
    "bogeys" INTEGER NOT NULL DEFAULT 0,
    "doubleBogeys" INTEGER NOT NULL DEFAULT 0,
    "worseThanDouble" INTEGER NOT NULL DEFAULT 0,
    "fairwaysHit" INTEGER,
    "fairwaysPossible" INTEGER,
    "greensHit" INTEGER,
    "greensPossible" INTEGER,
    "putts" INTEGER,
    "sgTotal" DOUBLE PRECISION,
    "sgPutting" DOUBLE PRECISION,
    "sgAroundGreen" DOUBLE PRECISION,
    "sgApproach" DOUBLE PRECISION,
    "sgOffTee" DOUBLE PRECISION,
    "longestDrive" INTEGER,
    "avgDrivingDist" DOUBLE PRECISION,
    "consecutiveBirdies" INTEGER NOT NULL DEFAULT 0,
    "bogeyFree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hole_scores" (
    "id" TEXT NOT NULL,
    "roundScoreId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "holeId" TEXT,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "score" INTEGER,
    "toPar" INTEGER,
    "putts" INTEGER,
    "penalties" INTEGER NOT NULL DEFAULT 0,
    "fairwayHit" BOOLEAN,
    "greenHit" BOOLEAN,
    "sandShot" BOOLEAN NOT NULL DEFAULT false,
    "teeDistance" INTEGER,
    "approachDistance" INTEGER,
    "proximityToPin" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hole_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_scores" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" INTEGER,
    "positionTied" BOOLEAN NOT NULL DEFAULT false,
    "totalToPar" INTEGER,
    "todayToPar" INTEGER,
    "thru" INTEGER,
    "currentRound" INTEGER,
    "currentHole" INTEGER,
    "winProbability" DOUBLE PRECISION,
    "top5Probability" DOUBLE PRECISION,
    "top10Probability" DOUBLE PRECISION,
    "top20Probability" DOUBLE PRECISION,
    "makeCutProbability" DOUBLE PRECISION,
    "sgTotalLive" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_predictions" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "winProbability" DOUBLE PRECISION,
    "top5Probability" DOUBLE PRECISION,
    "top10Probability" DOUBLE PRECISION,
    "top20Probability" DOUBLE PRECISION,
    "makeCutProbability" DOUBLE PRECISION,
    "expectedSgTotal" DOUBLE PRECISION,
    "expectedSgPutting" DOUBLE PRECISION,
    "expectedSgAroundGreen" DOUBLE PRECISION,
    "expectedSgApproach" DOUBLE PRECISION,
    "expectedSgOffTee" DOUBLE PRECISION,
    "courseFitScore" DOUBLE PRECISION,
    "sampleSize" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "betting_odds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sportsbook" TEXT NOT NULL,
    "marketType" TEXT NOT NULL,
    "americanOdds" INTEGER,
    "decimalOdds" DOUBLE PRECISION,
    "impliedProbability" DOUBLE PRECISION,
    "fairOdds" DOUBLE PRECISION,
    "edge" DOUBLE PRECISION,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "betting_odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dfs_slates" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "tournamentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "slateName" TEXT,
    "slateType" TEXT,
    "startTime" TIMESTAMP(3),
    "rosterSize" INTEGER,
    "salaryCap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dfs_slates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_dfs_entries" (
    "id" TEXT NOT NULL,
    "slateId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "salary" INTEGER,
    "ownership" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "projectedPoints" DOUBLE PRECISION,
    "projectedCeiling" DOUBLE PRECISION,
    "projectedFloor" DOUBLE PRECISION,
    "actualPoints" DOUBLE PRECISION,
    "actualOwnership" DOUBLE PRECISION,

    CONSTRAINT "player_dfs_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_course_history" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "avgToPar" DOUBLE PRECISION,
    "bestFinish" INTEGER,
    "cuts" INTEGER NOT NULL DEFAULT 0,
    "cutsMade" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "top10s" INTEGER NOT NULL DEFAULT 0,
    "sgTotal" DOUBLE PRECISION,
    "sgPutting" DOUBLE PRECISION,
    "sgApproach" DOUBLE PRECISION,
    "sgOffTee" DOUBLE PRECISION,
    "lastPlayed" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_course_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "courseId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "round" INTEGER,
    "temperature" DOUBLE PRECISION,
    "feelsLike" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "windGust" DOUBLE PRECISION,
    "windDirection" TEXT,
    "precipitation" DOUBLE PRECISION,
    "conditions" TEXT,
    "difficultyImpact" DOUBLE PRECISION,

    CONSTRAINT "weather_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "currentPick" INTEGER NOT NULL DEFAULT 1,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "timePerPick" INTEGER NOT NULL DEFAULT 90,
    "totalRounds" INTEGER NOT NULL DEFAULT 6,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_orders" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "draft_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_picks" (
    "id" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nominatedBy" TEXT,
    "isAutoPick" BOOLEAN NOT NULL DEFAULT false,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchups" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "homeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awayScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPlayoff" BOOLEAN NOT NULL DEFAULT false,
    "playoffRound" INTEGER,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "leagueId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "fantasyWeekId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matchups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picks" (
    "id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reviewUntil" TIMESTAMP(3),
    "initiatorId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "senderTeamId" TEXT NOT NULL,
    "receiverTeamId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "senderPlayers" JSONB NOT NULL DEFAULT '[]',
    "receiverPlayers" JSONB NOT NULL DEFAULT '[]',
    "senderPicks" JSONB NOT NULL DEFAULT '[]',
    "receiverPicks" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'CHAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_weeks" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FantasyWeekStatus" NOT NULL DEFAULT 'UPCOMING',
    "tournamentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fantasy_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_systems" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_scores" (
    "id" TEXT NOT NULL,
    "fantasyWeekId" TEXT NOT NULL,
    "scoringSystemId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "rank" INTEGER,
    "performanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fantasy_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "status" "LeagueSeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "championTeamId" TEXT,
    "finalStandings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_seasons" (
    "id" TEXT NOT NULL,
    "leagueSeasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "bestWeekPoints" DOUBLE PRECISION,
    "worstWeekPoints" DOUBLE PRECISION,
    "maxWinStreak" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_team_results" (
    "id" TEXT NOT NULL,
    "leagueSeasonId" TEXT NOT NULL,
    "teamSeasonId" TEXT NOT NULL,
    "fantasyWeekId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playerScores" JSONB NOT NULL DEFAULT '[]',
    "opponentTeamId" TEXT,
    "opponentPoints" DOUBLE PRECISION,
    "result" "MatchResult",
    "optimalPoints" DOUBLE PRECISION,
    "pointsLeftOnBench" DOUBLE PRECISION,
    "weekRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_team_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineup_snapshots" (
    "id" TEXT NOT NULL,
    "leagueSeasonId" TEXT NOT NULL,
    "fantasyWeekId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "lineup" JSONB NOT NULL DEFAULT '[]',
    "activePoints" DOUBLE PRECISION,
    "benchPoints" DOUBLE PRECISION,
    "optimalPoints" DOUBLE PRECISION,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lineup_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_transactions" (
    "id" TEXT NOT NULL,
    "leagueSeasonId" TEXT,
    "fantasyWeekId" TEXT,
    "teamId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "otherTeamId" TEXT,
    "otherPlayerId" TEXT,
    "otherPlayerName" TEXT,
    "draftRound" INTEGER,
    "draftPickNumber" INTEGER,
    "auctionAmount" DOUBLE PRECISION,
    "waiverBid" DOUBLE PRECISION,
    "waiverPriority" INTEGER,
    "tradeId" TEXT,
    "fantasyPointsGenerated" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "events" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "top5s" INTEGER NOT NULL DEFAULT 0,
    "top10s" INTEGER NOT NULL DEFAULT 0,
    "cutsMade" INTEGER NOT NULL DEFAULT 0,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fantasyPoints" JSONB NOT NULL DEFAULT '{}',
    "avgFantasyPoints" JSONB NOT NULL DEFAULT '{}',
    "stats" JSONB NOT NULL DEFAULT '{}',
    "rankings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_inviteCode_key" ON "leagues"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "league_members_userId_leagueId_key" ON "league_members"("userId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_userId_leagueId_key" ON "teams"("userId", "leagueId");

-- CreateIndex
CREATE INDEX "roster_entries_teamId_isActive_idx" ON "roster_entries"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "roster_entries_teamId_playerId_key" ON "roster_entries"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "players_externalId_key" ON "players"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "players_datagolfId_key" ON "players"("datagolfId");

-- CreateIndex
CREATE INDEX "players_owgrRank_idx" ON "players"("owgrRank");

-- CreateIndex
CREATE INDEX "players_name_idx" ON "players"("name");

-- CreateIndex
CREATE UNIQUE INDEX "courses_externalId_key" ON "courses"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "holes_courseId_number_key" ON "holes"("courseId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_externalId_key" ON "tournaments"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_datagolfId_key" ON "tournaments"("datagolfId");

-- CreateIndex
CREATE INDEX "performances_position_idx" ON "performances"("position");

-- CreateIndex
CREATE UNIQUE INDEX "performances_tournamentId_playerId_key" ON "performances"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "round_scores_tournamentId_playerId_roundNumber_key" ON "round_scores"("tournamentId", "playerId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "hole_scores_roundScoreId_holeNumber_key" ON "hole_scores"("roundScoreId", "holeNumber");

-- CreateIndex
CREATE INDEX "live_scores_position_idx" ON "live_scores"("position");

-- CreateIndex
CREATE UNIQUE INDEX "live_scores_tournamentId_playerId_key" ON "live_scores"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_predictions_tournamentId_playerId_key" ON "player_predictions"("tournamentId", "playerId");

-- CreateIndex
CREATE INDEX "betting_odds_tournamentId_marketType_idx" ON "betting_odds"("tournamentId", "marketType");

-- CreateIndex
CREATE UNIQUE INDEX "dfs_slates_externalId_key" ON "dfs_slates"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "player_dfs_entries_slateId_playerId_key" ON "player_dfs_entries"("slateId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_course_history_playerId_courseId_key" ON "player_course_history"("playerId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_orders_draftId_position_key" ON "draft_orders"("draftId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "draft_picks_draftId_pickNumber_key" ON "draft_picks"("draftId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX "picks_userId_leagueId_tournamentId_key" ON "picks"("userId", "leagueId", "tournamentId");

-- CreateIndex
CREATE INDEX "messages_leagueId_createdAt_idx" ON "messages"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_sportId_slug_key" ON "seasons"("sportId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_weeks_seasonId_weekNumber_key" ON "fantasy_weeks"("seasonId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_systems_sportId_slug_key" ON "scoring_systems"("sportId", "slug");

-- CreateIndex
CREATE INDEX "fantasy_scores_playerId_fantasyWeekId_idx" ON "fantasy_scores"("playerId", "fantasyWeekId");

-- CreateIndex
CREATE INDEX "fantasy_scores_fantasyWeekId_totalPoints_idx" ON "fantasy_scores"("fantasyWeekId", "totalPoints");

-- CreateIndex
CREATE INDEX "fantasy_scores_seasonId_playerId_idx" ON "fantasy_scores"("seasonId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_scores_fantasyWeekId_scoringSystemId_playerId_key" ON "fantasy_scores"("fantasyWeekId", "scoringSystemId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "league_seasons_leagueId_seasonId_key" ON "league_seasons"("leagueId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "team_seasons_leagueSeasonId_teamId_key" ON "team_seasons"("leagueSeasonId", "teamId");

-- CreateIndex
CREATE INDEX "weekly_team_results_fantasyWeekId_idx" ON "weekly_team_results"("fantasyWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_team_results_leagueSeasonId_teamId_fantasyWeekId_key" ON "weekly_team_results"("leagueSeasonId", "teamId", "fantasyWeekId");

-- CreateIndex
CREATE UNIQUE INDEX "lineup_snapshots_leagueSeasonId_fantasyWeekId_teamId_key" ON "lineup_snapshots"("leagueSeasonId", "fantasyWeekId", "teamId");

-- CreateIndex
CREATE INDEX "roster_transactions_playerId_idx" ON "roster_transactions"("playerId");

-- CreateIndex
CREATE INDEX "roster_transactions_leagueSeasonId_type_idx" ON "roster_transactions"("leagueSeasonId", "type");

-- CreateIndex
CREATE INDEX "roster_transactions_teamId_idx" ON "roster_transactions"("teamId");

-- CreateIndex
CREATE INDEX "roster_transactions_timestamp_idx" ON "roster_transactions"("timestamp");

-- CreateIndex
CREATE INDEX "player_season_stats_seasonId_idx" ON "player_season_stats"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_playerId_seasonId_key" ON "player_season_stats"("playerId", "seasonId");

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "scoring_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_entries" ADD CONSTRAINT "roster_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holes" ADD CONSTRAINT "holes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performances" ADD CONSTRAINT "performances_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performances" ADD CONSTRAINT "performances_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_scores" ADD CONSTRAINT "round_scores_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_scores" ADD CONSTRAINT "round_scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hole_scores" ADD CONSTRAINT "hole_scores_roundScoreId_fkey" FOREIGN KEY ("roundScoreId") REFERENCES "round_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hole_scores" ADD CONSTRAINT "hole_scores_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hole_scores" ADD CONSTRAINT "hole_scores_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "holes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_scores" ADD CONSTRAINT "live_scores_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_predictions" ADD CONSTRAINT "player_predictions_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_predictions" ADD CONSTRAINT "player_predictions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "betting_odds" ADD CONSTRAINT "betting_odds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dfs_slates" ADD CONSTRAINT "dfs_slates_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_dfs_entries" ADD CONSTRAINT "player_dfs_entries_slateId_fkey" FOREIGN KEY ("slateId") REFERENCES "dfs_slates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_dfs_entries" ADD CONSTRAINT "player_dfs_entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_course_history" ADD CONSTRAINT "player_course_history_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_course_history" ADD CONSTRAINT "player_course_history_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather" ADD CONSTRAINT "weather_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather" ADD CONSTRAINT "weather_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_orders" ADD CONSTRAINT "draft_orders_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picks" ADD CONSTRAINT "picks_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_senderTeamId_fkey" FOREIGN KEY ("senderTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_receiverTeamId_fkey" FOREIGN KEY ("receiverTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_weeks" ADD CONSTRAINT "fantasy_weeks_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_weeks" ADD CONSTRAINT "fantasy_weeks_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_systems" ADD CONSTRAINT "scoring_systems_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_scores" ADD CONSTRAINT "fantasy_scores_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_scores" ADD CONSTRAINT "fantasy_scores_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "scoring_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_scores" ADD CONSTRAINT "fantasy_scores_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_scores" ADD CONSTRAINT "fantasy_scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_seasons" ADD CONSTRAINT "league_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_seasons" ADD CONSTRAINT "team_seasons_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_team_results" ADD CONSTRAINT "weekly_team_results_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_team_results" ADD CONSTRAINT "weekly_team_results_teamSeasonId_fkey" FOREIGN KEY ("teamSeasonId") REFERENCES "team_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_team_results" ADD CONSTRAINT "weekly_team_results_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_team_results" ADD CONSTRAINT "weekly_team_results_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineup_snapshots" ADD CONSTRAINT "lineup_snapshots_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineup_snapshots" ADD CONSTRAINT "lineup_snapshots_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineup_snapshots" ADD CONSTRAINT "lineup_snapshots_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_transactions" ADD CONSTRAINT "roster_transactions_leagueSeasonId_fkey" FOREIGN KEY ("leagueSeasonId") REFERENCES "league_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_transactions" ADD CONSTRAINT "roster_transactions_fantasyWeekId_fkey" FOREIGN KEY ("fantasyWeekId") REFERENCES "fantasy_weeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_transactions" ADD CONSTRAINT "roster_transactions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_transactions" ADD CONSTRAINT "roster_transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

