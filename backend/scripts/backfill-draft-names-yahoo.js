#!/usr/bin/env node
/**
 * Backfill draft names using Yahoo's API (resolves the ~277 players Sleeper doesn't know)
 *
 * Requires Yahoo OAuth credentials:
 *   YAHOO_CLIENT_ID="..." YAHOO_CLIENT_SECRET="..." node scripts/backfill-draft-names-yahoo.js
 *
 * Steps:
 *   1. Refresh Yahoo OAuth token
 *   2. Find all unresolved player IDs in draft data
 *   3. Batch-fetch names from Yahoo API
 *   4. Update cache + draft data
 */

const { PrismaClient } = require('@prisma/client')

const RAILWAY_URL = 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway'
const YAHOO_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2'
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'
const USER_ID = 'cml8xo2960000ny2th1t4z5sd'

async function main() {
  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('Missing YAHOO_CLIENT_ID or YAHOO_CLIENT_SECRET env vars')
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } })

  try {
    // ── Step 1: Refresh Yahoo token ──
    console.log('=== Step 1: Refreshing Yahoo OAuth token ===\n')
    const tokenRecord = await prisma.userOAuthToken.findUnique({
      where: { userId_provider: { userId: USER_ID, provider: 'yahoo' } },
    })
    if (!tokenRecord || !tokenRecord.refreshToken) {
      throw new Error('No Yahoo refresh token found in DB')
    }

    const tokenRes = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenRecord.refreshToken,
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      throw new Error(`Token refresh failed (${tokenRes.status}): ${body}`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    // Save refreshed token back to DB
    await prisma.userOAuthToken.update({
      where: { userId_provider: { userId: USER_ID, provider: 'yahoo' } },
      data: {
        accessToken,
        refreshToken: tokenData.refresh_token || tokenRecord.refreshToken,
        expiresAt,
      },
    })
    console.log('  Token refreshed, expires:', expiresAt, '\n')

    // ── Step 2: Collect unresolved player IDs from draft data ──
    console.log('=== Step 2: Collecting unresolved player IDs ===\n')
    const seasons = await prisma.historicalSeason.findMany({
      where: { draftData: { not: null } },
      select: { id: true, seasonYear: true, draftData: true },
    })

    // Collect unique (numericId → set of full playerKeys)
    const idToKeys = new Map() // numericId → Set of full keys like "406.p.30971"
    for (const s of seasons) {
      const draft = s.draftData
      if (!draft || !draft.picks) continue
      for (const p of draft.picks) {
        if (!p.playerName && p.playerId) {
          const m = p.playerId.match(/\.p\.(\d+)$/)
          if (m) {
            const numId = Number(m[1])
            if (!idToKeys.has(numId)) idToKeys.set(numId, new Set())
            idToKeys.get(numId).add(p.playerId)
          }
        }
      }
    }

    console.log(`  Found ${idToKeys.size} unique unresolved Yahoo player IDs\n`)
    if (idToKeys.size === 0) {
      console.log('Nothing to resolve!')
      return
    }

    // ── Step 3: Batch fetch from Yahoo API ──
    // Yahoo needs the full player key (e.g., "406.p.30971"). Use one key per numeric ID.
    console.log('=== Step 3: Fetching names from Yahoo API ===\n')

    const allKeys = []
    for (const [numId, keys] of idToKeys) {
      // Pick the most recent game key (highest prefix number)
      const sorted = Array.from(keys).sort((a, b) => {
        const ga = parseInt(a.split('.')[0])
        const gb = parseInt(b.split('.')[0])
        return gb - ga
      })
      allKeys.push({ numId, playerKey: sorted[0] })
    }

    const nameMap = {} // numericId → fullName
    const BATCH_SIZE = 25

    for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
      const batch = allKeys.slice(i, i + BATCH_SIZE)
      const keysParam = batch.map(b => b.playerKey).join(',')
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(allKeys.length / BATCH_SIZE)

      try {
        const url = `${YAHOO_BASE}/players;player_keys=${keysParam}?format=json`
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          const body = await res.text()
          console.error(`  Batch ${batchNum}/${totalBatches} failed (${res.status}): ${body.substring(0, 200)}`)
          continue
        }

        const data = await res.json()
        const players = data?.fantasy_content?.players
        if (!players || typeof players !== 'object') {
          console.log(`  Batch ${batchNum}/${totalBatches}: no players in response`)
          continue
        }

        let batchResolved = 0
        for (const entry of Object.values(players)) {
          const player = entry?.player
          if (!player) continue
          const fields = Array.isArray(player) ? player.flat() : [player]
          let playerKey = null
          let fullName = null
          for (const f of fields) {
            if (!f || typeof f !== 'object') continue
            if (Array.isArray(f)) {
              for (const sub of f) {
                if (sub?.player_key) playerKey = sub.player_key
                if (sub?.name?.full) fullName = sub.name.full
              }
            } else {
              if (f.player_key) playerKey = f.player_key
              if (f.name?.full) fullName = f.name.full
            }
          }
          if (playerKey && fullName) {
            const m = playerKey.match(/\.p\.(\d+)$/)
            if (m) {
              nameMap[Number(m[1])] = fullName
              batchResolved++
            }
          }
        }
        console.log(`  Batch ${batchNum}/${totalBatches}: resolved ${batchResolved} names`)
      } catch (err) {
        console.error(`  Batch ${batchNum}/${totalBatches} error:`, err.message)
      }
    }

    console.log(`\n  Total resolved from Yahoo API: ${Object.keys(nameMap).length}/${allKeys.length}\n`)

    // ── Step 4: Update cache ──
    console.log('=== Step 4: Updating yahoo_player_cache ===\n')
    const toCache = Object.entries(nameMap).map(([id, name]) => ({
      yahooId: Number(id), fullName: name, position: null,
    }))

    if (toCache.length > 0) {
      // Dedupe
      const deduped = new Map()
      for (const p of toCache) deduped.set(p.yahooId, p)
      const unique = Array.from(deduped.values())

      for (let i = 0; i < unique.length; i += 500) {
        const chunk = unique.slice(i, i + 500)
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
             "updatedAt" = NOW()`,
          ...params
        )
      }
      console.log(`  Cached ${toCache.length} player names\n`)
    }

    // ── Step 5: Update draft data ──
    console.log('=== Step 5: Patching draft data ===\n')
    let totalResolved = 0
    let seasonsUpdated = 0

    for (const season of seasons) {
      const draft = season.draftData
      if (!draft || !draft.picks) continue

      let changed = false
      for (const pick of draft.picks) {
        if (pick.playerName) continue
        if (!pick.playerId) continue
        const m = pick.playerId.match(/\.p\.(\d+)$/)
        if (!m) continue
        const numId = Number(m[1])
        if (nameMap[numId]) {
          pick.playerName = nameMap[numId]
          totalResolved++
          changed = true
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

    console.log('=== Final Results ===')
    console.log(`  Yahoo API resolved:     ${Object.keys(nameMap).length} unique players`)
    console.log(`  Draft picks patched:    ${totalResolved}`)
    console.log(`  Seasons updated:        ${seasonsUpdated}`)
    console.log('\nDone!')

  } catch (err) {
    console.error('Backfill failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
