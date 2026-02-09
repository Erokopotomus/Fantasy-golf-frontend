/**
 * seedNflInfrastructure.js — Seeds all NFL fantasy infrastructure
 *
 * Creates: Sport config update, ScoringSystem presets (standard/ppr/half_ppr),
 *          Position records (QB/RB/WR/TE/K/DEF), RosterSlotDefinitions + Eligibility,
 *          Season + 18 FantasyWeek records for 2025 NFL season
 *
 * Safe to run multiple times (uses upserts throughout)
 */

const { PrismaClient } = require('@prisma/client')
const { STANDARD_RULES, PPR_RULES, HALF_PPR_RULES } = require('../src/services/nflScoringService')
const prisma = new PrismaClient()

// ─── 2025 NFL Schedule (Week start dates — Thursday to Monday) ──────────────

const NFL_2025_WEEKS = [
  { week: 1,  name: 'Week 1',  start: '2025-09-04', end: '2025-09-08' },
  { week: 2,  name: 'Week 2',  start: '2025-09-11', end: '2025-09-15' },
  { week: 3,  name: 'Week 3',  start: '2025-09-18', end: '2025-09-22' },
  { week: 4,  name: 'Week 4',  start: '2025-09-25', end: '2025-09-29' },
  { week: 5,  name: 'Week 5',  start: '2025-10-02', end: '2025-10-06' },
  { week: 6,  name: 'Week 6',  start: '2025-10-09', end: '2025-10-13' },
  { week: 7,  name: 'Week 7',  start: '2025-10-16', end: '2025-10-20' },
  { week: 8,  name: 'Week 8',  start: '2025-10-23', end: '2025-10-27' },
  { week: 9,  name: 'Week 9',  start: '2025-10-30', end: '2025-11-03' },
  { week: 10, name: 'Week 10', start: '2025-11-06', end: '2025-11-10' },
  { week: 11, name: 'Week 11', start: '2025-11-13', end: '2025-11-17' },
  { week: 12, name: 'Week 12', start: '2025-11-20', end: '2025-11-24' },
  { week: 13, name: 'Week 13', start: '2025-11-27', end: '2025-12-01' },
  { week: 14, name: 'Week 14', start: '2025-12-04', end: '2025-12-08' },
  { week: 15, name: 'Week 15', start: '2025-12-11', end: '2025-12-15' },
  { week: 16, name: 'Week 16', start: '2025-12-18', end: '2025-12-22' },
  { week: 17, name: 'Week 17', start: '2025-12-25', end: '2025-12-29' },
  { week: 18, name: 'Week 18', start: '2026-01-01', end: '2026-01-05' },
]

// ─── NFL Positions ──────────────────────────────────────────────────────────

const NFL_POSITIONS = [
  { abbr: 'QB',  name: 'Quarterback',           sortOrder: 1,  config: {} },
  { abbr: 'RB',  name: 'Running Back',          sortOrder: 2,  config: {} },
  { abbr: 'WR',  name: 'Wide Receiver',         sortOrder: 3,  config: {} },
  { abbr: 'TE',  name: 'Tight End',             sortOrder: 4,  config: {} },
  { abbr: 'K',   name: 'Kicker',                sortOrder: 5,  config: {} },
  { abbr: 'DEF', name: 'Defense/Special Teams',  sortOrder: 6,  config: {} },
  // IDP positions (future — available in Position table for when IDP leagues are enabled)
  { abbr: 'DL',  name: 'Defensive Line',        sortOrder: 10, config: { category: 'IDP' } },
  { abbr: 'LB',  name: 'Linebacker',            sortOrder: 11, config: { category: 'IDP' } },
  { abbr: 'DB',  name: 'Defensive Back',        sortOrder: 12, config: { category: 'IDP' } },
  { abbr: 'DE',  name: 'Defensive End',         sortOrder: 13, config: { category: 'IDP' } },
  { abbr: 'DT',  name: 'Defensive Tackle',      sortOrder: 14, config: { category: 'IDP' } },
  { abbr: 'CB',  name: 'Cornerback',            sortOrder: 15, config: { category: 'IDP' } },
  { abbr: 'S',   name: 'Safety',                sortOrder: 16, config: { category: 'IDP' } },
]

// ─── NFL Roster Slots ───────────────────────────────────────────────────────

const NFL_ROSTER_SLOTS = [
  { slotKey: 'QB1',   displayName: 'Quarterback',    slotType: 'STARTER', sortOrder: 1,  eligible: ['QB'] },
  { slotKey: 'RB1',   displayName: 'Running Back',   slotType: 'STARTER', sortOrder: 2,  eligible: ['RB'] },
  { slotKey: 'RB2',   displayName: 'Running Back',   slotType: 'STARTER', sortOrder: 3,  eligible: ['RB'] },
  { slotKey: 'WR1',   displayName: 'Wide Receiver',  slotType: 'STARTER', sortOrder: 4,  eligible: ['WR'] },
  { slotKey: 'WR2',   displayName: 'Wide Receiver',  slotType: 'STARTER', sortOrder: 5,  eligible: ['WR'] },
  { slotKey: 'WR3',   displayName: 'Wide Receiver',  slotType: 'STARTER', sortOrder: 6,  eligible: ['WR'] },
  { slotKey: 'TE1',   displayName: 'Tight End',      slotType: 'STARTER', sortOrder: 7,  eligible: ['TE'] },
  { slotKey: 'FLEX1', displayName: 'Flex',            slotType: 'STARTER', sortOrder: 8,  eligible: ['RB', 'WR', 'TE'] },
  { slotKey: 'K1',    displayName: 'Kicker',          slotType: 'STARTER', sortOrder: 9,  eligible: ['K'] },
  { slotKey: 'DEF1',  displayName: 'Defense',         slotType: 'STARTER', sortOrder: 10, eligible: ['DEF'] },
  { slotKey: 'BN1',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 11, eligible: [] },
  { slotKey: 'BN2',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 12, eligible: [] },
  { slotKey: 'BN3',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 13, eligible: [] },
  { slotKey: 'BN4',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 14, eligible: [] },
  { slotKey: 'BN5',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 15, eligible: [] },
  { slotKey: 'BN6',   displayName: 'Bench',           slotType: 'BENCH',   sortOrder: 16, eligible: [] },
  { slotKey: 'IR1',   displayName: 'Injured Reserve',  slotType: 'IR',      sortOrder: 17, eligible: [] },
]

// ─── Main Seed Function ─────────────────────────────────────────────────────

async function seed() {
  console.log('═══ Seeding NFL Infrastructure ═══\n')

  // 1. Get or create NFL Sport (nflSync may have already created it)
  let sport = await prisma.sport.findUnique({ where: { slug: 'nfl' } })
  if (!sport) {
    sport = await prisma.sport.create({
      data: {
        slug: 'nfl',
        name: 'NFL',
        isActive: true,
        config: {},
      },
    })
    console.log('[1] Created NFL sport record')
  }

  // Update sport config with full fantasy settings
  sport = await prisma.sport.update({
    where: { slug: 'nfl' },
    data: {
      config: {
        seasonType: 'calendar',
        weekDefinition: 'nfl_week',
        statCategories: ['passing', 'rushing', 'receiving', 'kicking', 'defense'],
        rosterPositions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FLEX', 'BN', 'IR'],
        defaultScoringPresets: ['standard', 'ppr', 'half_ppr'],
        positionBased: true,
      },
    },
  })
  console.log('[1] NFL sport config updated')

  // 2. Scoring Systems (flat key-value maps — Sleeper-style)
  const scoringConfigs = [
    { name: 'Standard',  slug: 'standard',  rules: { preset: 'standard', ...STANDARD_RULES },  isDefault: true },
    { name: 'PPR',       slug: 'ppr',        rules: { preset: 'ppr', ...PPR_RULES },            isDefault: false },
    { name: 'Half PPR',  slug: 'half_ppr',   rules: { preset: 'half_ppr', ...HALF_PPR_RULES },  isDefault: false },
    { name: 'Custom',    slug: 'custom',     rules: { preset: 'custom', ...HALF_PPR_RULES },    isDefault: false, isSystem: false },
  ]

  const scoringSystems = {}
  for (const cfg of scoringConfigs) {
    const isSystem = cfg.isSystem !== undefined ? cfg.isSystem : true
    const ss = await prisma.scoringSystem.upsert({
      where: { sportId_slug: { sportId: sport.id, slug: cfg.slug } },
      update: { name: cfg.name, rules: cfg.rules, isDefault: cfg.isDefault, isSystem },
      create: {
        sportId: sport.id,
        name: cfg.name,
        slug: cfg.slug,
        isDefault: cfg.isDefault,
        isSystem,
        rules: cfg.rules,
      },
    })
    scoringSystems[cfg.slug] = ss
    console.log(`[2] Scoring system: ${cfg.name}${isSystem ? '' : ' (template)'}`)
  }

  // 3. Positions
  const positions = {}
  for (const pos of NFL_POSITIONS) {
    const p = await prisma.position.upsert({
      where: { sportId_abbr: { sportId: sport.id, abbr: pos.abbr } },
      update: { name: pos.name, sortOrder: pos.sortOrder, config: pos.config || {} },
      create: {
        sportId: sport.id,
        abbr: pos.abbr,
        name: pos.name,
        sortOrder: pos.sortOrder,
        config: pos.config || {},
      },
    })
    positions[pos.abbr] = p
  }
  console.log(`[3] ${NFL_POSITIONS.length} positions created/updated (includes IDP)`)

  // 4. Roster Slot Definitions (on Standard scoring system — other presets share same slots)
  const standardSS = scoringSystems['standard']
  for (const slot of NFL_ROSTER_SLOTS) {
    const rsd = await prisma.rosterSlotDefinition.upsert({
      where: { scoringSystemId_slotKey: { scoringSystemId: standardSS.id, slotKey: slot.slotKey } },
      update: { displayName: slot.displayName, slotType: slot.slotType, sortOrder: slot.sortOrder },
      create: {
        scoringSystemId: standardSS.id,
        slotKey: slot.slotKey,
        displayName: slot.displayName,
        slotType: slot.slotType,
        sortOrder: slot.sortOrder,
        maxPlayers: 1,
      },
    })

    // Set eligibility for starter slots (bench/IR accept any)
    if (slot.eligible.length > 0) {
      for (const posAbbr of slot.eligible) {
        const pos = positions[posAbbr]
        if (!pos) continue
        await prisma.rosterSlotEligibility.upsert({
          where: {
            rosterSlotDefinitionId_positionId: {
              rosterSlotDefinitionId: rsd.id,
              positionId: pos.id,
            },
          },
          update: {},
          create: {
            rosterSlotDefinitionId: rsd.id,
            positionId: pos.id,
          },
        })
      }
    }
  }
  console.log(`[4] ${NFL_ROSTER_SLOTS.length} roster slots + eligibility created`)

  // Also create slots for PPR and Half PPR (same structure)
  for (const ssKey of ['ppr', 'half_ppr']) {
    const ss = scoringSystems[ssKey]
    for (const slot of NFL_ROSTER_SLOTS) {
      const rsd = await prisma.rosterSlotDefinition.upsert({
        where: { scoringSystemId_slotKey: { scoringSystemId: ss.id, slotKey: slot.slotKey } },
        update: { displayName: slot.displayName, slotType: slot.slotType, sortOrder: slot.sortOrder },
        create: {
          scoringSystemId: ss.id,
          slotKey: slot.slotKey,
          displayName: slot.displayName,
          slotType: slot.slotType,
          sortOrder: slot.sortOrder,
          maxPlayers: 1,
        },
      })

      if (slot.eligible.length > 0) {
        for (const posAbbr of slot.eligible) {
          const pos = positions[posAbbr]
          if (!pos) continue
          await prisma.rosterSlotEligibility.upsert({
            where: {
              rosterSlotDefinitionId_positionId: {
                rosterSlotDefinitionId: rsd.id,
                positionId: pos.id,
              },
            },
            update: {},
            create: {
              rosterSlotDefinitionId: rsd.id,
              positionId: pos.id,
            },
          })
        }
      }
    }
    console.log(`[4] Roster slots duplicated for ${ssKey}`)
  }

  // 5. Season — 2025 NFL Season
  const season = await prisma.season.upsert({
    where: { sportId_slug: { sportId: sport.id, slug: '2025' } },
    update: {
      name: '2025 NFL Season',
      startDate: new Date('2025-09-04'),
      endDate: new Date('2026-01-05'),
      isCurrent: true,
    },
    create: {
      sportId: sport.id,
      name: '2025 NFL Season',
      year: 2025,
      slug: '2025',
      startDate: new Date('2025-09-04'),
      endDate: new Date('2026-01-05'),
      isCurrent: true,
    },
  })
  console.log(`[5] Season: ${season.name}`)

  // 6. Fantasy Weeks — 18 NFL weeks
  for (const wk of NFL_2025_WEEKS) {
    await prisma.fantasyWeek.upsert({
      where: { seasonId_weekNumber: { seasonId: season.id, weekNumber: wk.week } },
      update: {
        name: wk.name,
        startDate: new Date(wk.start),
        endDate: new Date(wk.end),
      },
      create: {
        seasonId: season.id,
        weekNumber: wk.week,
        name: wk.name,
        startDate: new Date(wk.start),
        endDate: new Date(wk.end),
        status: 'UPCOMING',
      },
    })
  }
  console.log(`[6] ${NFL_2025_WEEKS.length} fantasy weeks created`)

  console.log('\n═══ NFL Infrastructure Seed Complete ═══')
  console.log(`  Sport: ${sport.id}`)
  console.log(`  Scoring: ${Object.keys(scoringSystems).join(', ')}`)
  console.log(`  Positions: ${Object.keys(positions).join(', ')}`)
  console.log(`  Roster slots: ${NFL_ROSTER_SLOTS.length} per scoring system`)
  console.log(`  Season: ${season.name} (${NFL_2025_WEEKS.length} weeks)`)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
