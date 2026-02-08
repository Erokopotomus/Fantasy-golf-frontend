/**
 * ETL Pipeline — Extract, Transform, Load
 *
 * Separation of concerns:
 *   - datagolfSync.js: fetches raw data + calls stageRaw + calls transform
 *   - etlPipeline.js: raw staging, transform logic, source tagging, cleanup
 *
 * Layer 1 (Raw): stageRaw() persists raw provider JSON
 * Layer 2 (Canonical): transform*() writes to Player/Tournament/Performance with source tags
 */

// ─── Raw Staging (Layer 1) ────────────────────────────────────────────────────

async function stageRaw(prisma, provider, dataType, eventRef, payload) {
  try {
    const recordCount = Array.isArray(payload) ? payload.length
      : payload?.players?.length || payload?.rankings?.length
        || payload?.schedule?.length || payload?.field?.length
        || payload?.data?.length || payload?.baseline?.length
        || payload?.projections?.length || payload?.live_stats?.length || null

    const record = await prisma.rawProviderData.create({
      data: {
        provider,
        dataType,
        eventRef: eventRef ? String(eventRef) : null,
        payload,
        recordCount,
      },
    })
    return record.id
  } catch (e) {
    console.warn(`[ETL:stageRaw] Failed ${provider}/${dataType}: ${e.message}`)
    return null
  }
}

// ─── Mark Raw as Processed ────────────────────────────────────────────────────

async function markProcessed(prisma, rawId) {
  if (!rawId) return
  try {
    await prisma.rawProviderData.update({
      where: { id: rawId },
      data: { processedAt: new Date() },
    })
  } catch (e) {
    // Non-critical
  }
}

// ─── Event ID Map (Rosetta Stone) ─────────────────────────────────────────────

async function upsertEventIdMap(prisma, { tournamentId, datagolfEventId, eventName, startDate, endDate }) {
  if (!datagolfEventId || !tournamentId) return

  await prisma.clutchEventIdMap.upsert({
    where: { datagolfEventId: String(datagolfEventId) },
    update: {
      tournamentId,
      eventName,
      startDate,
      endDate,
      updatedAt: new Date(),
    },
    create: {
      sport: 'golf',
      datagolfEventId: String(datagolfEventId),
      tournamentId,
      eventName,
      startDate,
      endDate,
    },
  })
}

// ─── Bulk Upsert with Source Tracking ─────────────────────────────────────────

/**
 * Build and execute a raw SQL bulk upsert with source tracking fields.
 * @param {object} prisma
 * @param {string} table - SQL table name
 * @param {string} conflictCol - Conflict column for ON CONFLICT
 * @param {string[]} cols - Column names
 * @param {Array<object>} rows - Row objects
 * @param {object} opts - { casts, provider }
 */
async function bulkUpsert(prisma, table, conflictCol, cols, rows, opts = {}) {
  if (rows.length === 0) return 0

  const casts = opts.casts || {}
  const provider = opts.provider || null

  // Add source tracking columns if provider is set
  const trackingCols = provider
    ? ['sourceProvider', 'sourceIngestedAt', 'clutchTransformedAt']
    : []
  const allDataCols = [...cols, ...trackingCols]
  const allCols = [...allDataCols, 'createdAt', 'updatedAt']
  const colList = allCols.map((c) => `"${c}"`).join(', ')

  const chunkSize = Math.min(500, Math.floor(65000 / allCols.length))
  let total = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const values = []
    const params = []
    let paramIdx = 1

    for (const row of chunk) {
      const placeholders = allCols.map((col) => {
        const p = `$${paramIdx++}`
        return casts[col] ? `${p}::"${casts[col]}"` : p
      })
      values.push(`(${placeholders.join(', ')})`)

      for (const col of cols) {
        params.push(row[col] ?? null)
      }
      // Source tracking values
      if (provider) {
        params.push(provider)
        params.push(new Date())
        params.push(new Date())
      }
      // createdAt, updatedAt
      params.push(new Date())
      params.push(new Date())
    }

    const conflictName = conflictCol.replace(/"/g, '')
    const updateCols = allDataCols.filter((c) => c !== conflictName && c !== 'id')
    const setClause = updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')

    const sql = `
      INSERT INTO "${table}" (${colList})
      VALUES ${values.join(', ')}
      ON CONFLICT (${conflictCol}) DO UPDATE SET ${setClause}, "updatedAt" = NOW()
    `

    await prisma.$executeRawUnsafe(sql, ...params)
    total += chunk.length
  }
  return total
}

// ─── Raw Data Cleanup ─────────────────────────────────────────────────────────

async function cleanupOldRawData(prisma, retentionDays = 90) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const result = await prisma.rawProviderData.deleteMany({
    where: { ingestedAt: { lt: cutoff } },
  })

  console.log(`[ETL:cleanup] Deleted ${result.count} raw records older than ${retentionDays} days`)
  return result.count
}

module.exports = {
  stageRaw,
  markProcessed,
  upsertEventIdMap,
  bulkUpsert,
  cleanupOldRawData,
}
