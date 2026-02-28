#!/usr/bin/env node
/**
 * One-off script: Backfill player names in Yahoo draft data
 *
 * Seeds the yahoo_player_cache from Sleeper's API, then patches all
 * HistoricalSeason records that have draftData with null playerNames.
 *
 * Usage: cd ~/Desktop/Golf/backend && node scripts/backfill-draft-names.js
 */

const { PrismaClient } = require('@prisma/client')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } })

  try {
    // ── Step 1: Seed cache from Sleeper ──
    console.log('=== Step 1: Seeding yahoo_player_cache from Sleeper API ===\n')

    const res = await fetch('https://api.sleeper.app/v1/players/nfl')
    const players = await res.json()

    // Dedupe by yahooId (Sleeper data has duplicates)
    const deduped = new Map()
    for (const [, p] of Object.entries(players)) {
      if (p.yahoo_id && p.full_name) {
        deduped.set(Number(p.yahoo_id), {
          yahooId: Number(p.yahoo_id),
          fullName: p.full_name,
          position: p.position || null,
        })
      }
    }
    const toSeed = Array.from(deduped.values())

    // Bulk upsert in chunks
    const CHUNK = 500
    for (let i = 0; i < toSeed.length; i += CHUNK) {
      const chunk = toSeed.slice(i, i + CHUNK)
      const values = []
      const params = []
      let idx = 1
      for (const p of chunk) {
        values.push(`($${idx}, $${idx + 1}, $${idx + 2}, NOW())`)
        params.push(p.yahooId, p.fullName, p.position)
        idx += 3
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO yahoo_player_cache ("yahooId", "fullName", "position", "updatedAt")
         VALUES ${values.join(', ')}
         ON CONFLICT ("yahooId") DO UPDATE SET
           "fullName" = EXCLUDED."fullName",
           "position" = COALESCE(EXCLUDED."position", yahoo_player_cache."position"),
           "updatedAt" = NOW()`,
        ...params
      )
    }
    console.log(`  Seeded ${toSeed.length} players into cache\n`)

    // ── Step 1b: Add Yahoo DST mappings (100001-100034) ──
    // Yahoo uses high IDs for team defenses — Sleeper doesn't map these
    const DST_MAP = {
      100001: 'Arizona Cardinals', 100002: 'Atlanta Falcons', 100003: 'Baltimore Ravens',
      100004: 'Buffalo Bills', 100005: 'Carolina Panthers', 100006: 'Chicago Bears',
      100007: 'Cincinnati Bengals', 100008: 'Cleveland Browns', 100009: 'Dallas Cowboys',
      100010: 'Denver Broncos', 100011: 'Detroit Lions', 100012: 'Green Bay Packers',
      100013: 'Houston Texans', 100014: 'Indianapolis Colts', 100015: 'Jacksonville Jaguars',
      100016: 'Kansas City Chiefs', 100017: 'Las Vegas Raiders', 100018: 'Los Angeles Chargers',
      100019: 'Los Angeles Rams', 100020: 'Miami Dolphins', 100021: 'Minnesota Vikings',
      100022: 'New England Patriots', 100023: 'New Orleans Saints', 100024: 'New York Giants',
      100025: 'New York Jets', 100026: 'Philadelphia Eagles', 100027: 'Pittsburgh Steelers',
      100028: 'San Francisco 49ers', 100029: 'Seattle Seahawks', 100030: 'Tampa Bay Buccaneers',
      100031: 'Tennessee Titans', 100032: 'Washington Commanders',
      // Legacy names (before rebrand) — same IDs
      100033: 'Oakland Raiders', 100034: 'Washington Football Team',
    }
    const dstEntries = Object.entries(DST_MAP).map(([id, name]) => ({
      yahooId: Number(id), fullName: name, position: 'DEF',
    }))
    // Dedupe DST (no dupes expected, but safe)
    const dstDeduped = new Map()
    for (const d of dstEntries) dstDeduped.set(d.yahooId, d)
    const dstArr = Array.from(dstDeduped.values())
    const dstValues = []
    const dstParams = []
    let dstIdx = 1
    for (const d of dstArr) {
      dstValues.push(`($${dstIdx}, $${dstIdx + 1}, $${dstIdx + 2}, NOW())`)
      dstParams.push(d.yahooId, d.fullName, d.position)
      dstIdx += 3
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO yahoo_player_cache ("yahooId", "fullName", "position", "updatedAt")
       VALUES ${dstValues.join(', ')}
       ON CONFLICT ("yahooId") DO UPDATE SET
         "fullName" = EXCLUDED."fullName",
         "position" = COALESCE(EXCLUDED."position", yahoo_player_cache."position"),
         "updatedAt" = NOW()`,
      ...dstParams
    )
    console.log(`  Added ${dstArr.length} DST mappings to cache\n`)

    // ── Step 2: Load cache into memory ──
    console.log('=== Step 2: Loading cache into memory ===\n')
    const cacheRows = await prisma.$queryRaw`SELECT "yahooId", "fullName" FROM yahoo_player_cache`
    const nameMap = {}
    for (const row of cacheRows) {
      nameMap[row.yahooId] = row.fullName
    }
    console.log(`  ${Object.keys(nameMap).length} entries in cache\n`)

    // ── Step 3: Find all HistoricalSeasons with draftData ──
    console.log('=== Step 3: Scanning HistoricalSeason records ===\n')
    const seasons = await prisma.historicalSeason.findMany({
      where: { draftData: { not: null } },
      select: { id: true, teamName: true, seasonYear: true, draftData: true },
    })
    console.log(`  Found ${seasons.length} seasons with draft data\n`)

    // ── Step 4: Resolve null playerNames ──
    console.log('=== Step 4: Resolving null player names ===\n')
    let totalPicks = 0
    let totalResolved = 0
    let totalAlreadyNamed = 0
    let totalStillNull = 0
    let seasonsUpdated = 0

    for (const season of seasons) {
      const draft = season.draftData
      if (!draft || !draft.picks || !Array.isArray(draft.picks)) continue

      let changed = false
      for (const pick of draft.picks) {
        totalPicks++
        if (pick.playerName) {
          totalAlreadyNamed++
          continue
        }
        if (!pick.playerId) continue

        // Extract numeric Yahoo ID from key like "406.p.30121"
        const match = pick.playerId.match(/\.p\.(\d+)$/)
        if (!match) continue
        const numId = Number(match[1])

        if (nameMap[numId]) {
          pick.playerName = nameMap[numId]
          totalResolved++
          changed = true
        } else {
          totalStillNull++
        }
      }

      if (changed) {
        await prisma.historicalSeason.update({
          where: { id: season.id },
          data: { draftData: draft },
        })
        seasonsUpdated++
      }
    }

    console.log('=== Results ===')
    console.log(`  Total picks scanned:    ${totalPicks}`)
    console.log(`  Already had names:      ${totalAlreadyNamed}`)
    console.log(`  Newly resolved:         ${totalResolved}`)
    console.log(`  Still unresolved:       ${totalStillNull}`)
    console.log(`  Seasons updated:        ${seasonsUpdated}`)
    console.log('\nDone!')

  } catch (err) {
    console.error('Backfill failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
