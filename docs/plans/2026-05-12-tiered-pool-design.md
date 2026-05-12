# Tiered Golf Pool — Design Doc

**Date:** 2026-05-12
**Status:** Approved
**Author:** Eric (with Claude Code)
**Reference inspiration:** easyofficepools.com

---

## Goal

Ship a single-tournament tiered pick'em pool by tomorrow so Eric can run it with friends for the PGA Championship weekend. Match feature parity with easyofficepools, beat them on data + live experience.

## Non-goals (this trial)

- Multi-tournament series (Masters → US Open → Open → PGA aggregate). Future.
- Auto-tiering from OWGR/CPI/odds. Future. Commissioner builds tiers by hand for v1.
- Required Clutch accounts. Anonymous entry via link only.
- Entry fees / prize escrow / payments. Bragging rights only.
- Smart pick suggestions from the AI coach. Future.

## User stories

1. **Commissioner Eric** wants to spin up a pool in <5 min: pick a tournament, define 4-5 tiers, drag/assign golfers into each, set picks-per-tier, publish. Get a share link + a separate admin link.
2. **Friend (anonymous)** clicks the share link, sees the tournament info + tiers, picks N golfers from each tier, enters team name + tiebreaker (winning golfer's final to-par score), submits with name + email. Gets an email confirmation.
3. **Anyone with the link** sees the live leaderboard during the tournament, refreshed automatically (Clutch's existing live cron handles scoring).
4. **Eric** sees all entries on the admin page (gated by admin token), can disqualify, edit tiers before lock, etc.

## Approach

**Approach 3 (selected):** Standalone Pool entity (parallel to League), with `PoolEntry.userId` nullable so a future migration can link entries to Clutch accounts without schema churn.

## Data model

Five new tables. No changes to existing schema.

```prisma
model Pool {
  id                String      @id @default(cuid())
  slug              String      @unique           // public URL: /pools/myrtle-26
  name              String                         // "Myrtle Beach Pool"
  tournamentId      String
  commissionerEmail String
  adminToken        String      @unique            // secret commish URL gate
  status            PoolStatus  @default(DRAFT)    // DRAFT | OPEN | LOCKED | COMPLETED
  locksAt           DateTime?                      // computed: first R1 tee time
  scoringPreset     String      @default("standard")
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  tournament        Tournament  @relation(fields: [tournamentId], references: [id])
  tiers             PoolTier[]
  entries           PoolEntry[]
}

model PoolTier {
  id            String           @id @default(cuid())
  poolId        String
  tierNumber    Int                                // 1-based
  label         String?                            // "A — Stars", optional
  picksRequired Int
  pool          Pool             @relation(fields: [poolId], references: [id], onDelete: Cascade)
  players       PoolTierPlayer[]
  picks         PoolPick[]
  @@unique([poolId, tierNumber])
}

model PoolTierPlayer {
  id       String   @id @default(cuid())
  tierId   String
  playerId String
  tier     PoolTier @relation(fields: [tierId], references: [id], onDelete: Cascade)
  player   Player   @relation(fields: [playerId], references: [id])
  @@unique([tierId, playerId])
}

model PoolEntry {
  id                 String     @id @default(cuid())
  poolId             String
  userId             String?                       // nullable — anonymous-friendly today, account-linked later
  entrantName        String
  entrantEmail       String
  teamName           String
  tiebreakerScore    Int                           // predicted winning to-par (no playoff)
  totalFantasyPoints Float      @default(0)        // denormalized for fast leaderboard
  submittedAt        DateTime   @default(now())
  pool               Pool       @relation(fields: [poolId], references: [id], onDelete: Cascade)
  user               User?      @relation(fields: [userId], references: [id])
  picks              PoolPick[]
  @@unique([poolId, teamName])
}

model PoolPick {
  id            String    @id @default(cuid())
  entryId       String
  tierId        String
  playerId      String
  fantasyPoints Float?
  entry         PoolEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  tier          PoolTier  @relation(fields: [tierId], references: [id])
  player        Player    @relation(fields: [playerId], references: [id])
  @@unique([entryId, tierId, playerId])
}

enum PoolStatus { DRAFT OPEN LOCKED COMPLETED }
```

Also: add `pools Pool[]` relation back-references on `Tournament`, `User`, `Player`.

## API surface

**Public (no auth):**
- `GET /api/pools/:slug` — pool metadata + tournament + tiers + tier players
- `GET /api/pools/:slug/leaderboard` — entries sorted by `totalFantasyPoints`, tiebreaker applied
- `POST /api/pools/:slug/entries` — submit entry. Body: `{ entrantName, entrantEmail, teamName, tiebreakerScore, picks: [{ tierId, playerId }] }`. Validations: status must be OPEN, exactly `picksRequired` picks per tier, all tier-player combos valid, teamName unique, email valid

**Admin (gated by `adminToken` query param or header):**
- `POST /api/pools` — create. Body: `{ name, tournamentId, commissionerEmail, scoringPreset, tiers: [{ tierNumber, label, picksRequired, playerIds: [] }] }`. Generates slug + adminToken.
- `PATCH /api/pools/:slug` — edit pool metadata, tiers, players (only while status=DRAFT or OPEN)
- `POST /api/pools/:slug/publish` — DRAFT → OPEN. Computes `locksAt` from first R1 tee time.
- `POST /api/pools/:slug/lock` — OPEN → LOCKED (also called automatically when `locksAt` passes)
- `DELETE /api/pools/:slug/entries/:entryId` — DQ an entry

## Scoring + locking

- **Locking:** A cron (run every 1-2 min Thu-Sun) checks any OPEN pool whose `locksAt < now()` and flips it to LOCKED. Submissions to a LOCKED pool return 409.
- **Scoring:** A second cron (every 5 min Thu-Sun, can ride alongside the existing live cron) recomputes `PoolPick.fantasyPoints` for each LOCKED pool by reading `Performance` for the tournament + the chosen `scoringPreset` (already implemented as `calculateFantasyPoints` in the codebase). Sums per entry into `totalFantasyPoints`. Tiebreaker is only applied at display time, not stored.
- **Leaderboard sort:** `totalFantasyPoints DESC, ABS(tiebreakerScore - actual winning to-par) ASC, submittedAt ASC`.

## UI surface

Three pages, all on `/pools/...`:

**1. `/pools/new`** — commissioner creation flow. Single page, no auth.
- Choose tournament from a dropdown (existing UPCOMING tournaments)
- Name the pool
- Email (for admin link)
- Add tiers (number them, label optional, set picksRequired)
- Per tier: add players — search/select from tournament field. Show OWGR + odds + CPI as hints (we have all of these).
- "Publish" → returns share link + admin link

**2. `/pools/:slug`** — public entry + leaderboard.
- Status `OPEN`: shows tiers + golfer cards + entry form. Submit → confirmation screen with team name + summary.
- Status `LOCKED` / `COMPLETED`: shows live leaderboard, drilldown per entry.
- Existing PlayerDrawer integration on golfer cards for SG/CPI/course history. That's our edge over easyofficepools.

**3. `/pools/:slug/admin?token=...`** — commissioner admin.
- See all entries
- Edit tiers (DRAFT/OPEN only)
- DQ an entry
- Manual lock / publish controls

## Email notifications

Use Resend (already wired). Two emails:
1. **On pool creation** → commissioner gets the admin token + share link.
2. **On entry submission** → entrant gets confirmation with picks + team name + share link.

No reminder/recap emails in v1 (future).

## Edge cases

- **Player WDs after lock:** their pick scores whatever the scoring config returns (zero for DNS; made-cut bonus skipped if MC; whatever the existing engine produces). Pool participants are stuck with their picks. No re-pick allowed.
- **Tournament canceled:** pool stays open in COMPLETED state, leaderboard shows zeros. No refund flow because no money.
- **Duplicate team names:** unique constraint per pool. Form rejects.
- **Spam entries:** rate limit by IP + email (defer to next iteration if needed).
- **Same email submits twice:** allowed for now (a friend might run two teams). Different teamName required.
- **Commissioner loses admin token:** they can recover it via the email we sent. No password reset flow.

## Out of scope (deferred)

- Auto-tiering by OWGR/CPI/odds
- AI coach suggestions for "best picks"
- Multi-tournament series scoring
- Clutch account linkage for entries (schema-ready, UI later)
- Entry fees / payments / prize escrow
- Reminder emails (lock soon, scoring updates, final results)
- Mobile-optimized pick UI polish (basic responsive only)
- Embedding pool inside an existing Clutch League (sidegame mode)

## Success criteria

- Eric creates a pool, gets share link in <5 min.
- Friends click link, pick, submit in <2 min each.
- Lock fires automatically at first R1 tee time.
- Leaderboard updates live during tournament.
- No data corruption — picks visible to entrants forever (or until pool is deleted).
- Renders fine on a phone (no native pinch-zoom needed to use it).
