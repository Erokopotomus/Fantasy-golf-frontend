/**
 * Prep Quiz Template Library (DS-8)
 *
 * Each template knows how to generate a set of quiz cards (one per subject —
 * typically per team) from a pre-loaded `spine` snapshot. Templates are
 * pure functions over the snapshot to avoid N+1 queries; the generator
 * (quizCardGenerator.js) loads the spine once and passes it in.
 *
 * Card shape returned by every template:
 *   { templateName, subject, question, answer, distractors: [s, s, s],
 *     difficulty, category, meta: {} }
 *
 * If a template can't build a high-quality card for a subject (missing
 * data, distractor pool too small, etc.) it SKIPS that subject — never
 * fabricates. Better to deactivate a card than ship a wrong one.
 */

/**
 * Pick `count` distinct random items from `pool`, excluding any value
 * equal to `exclude` (or any in `exclude` if it's an array).
 * Returns null if the pool is too small to produce `count` distinct items.
 */
function pickDistinctRandom(pool, count, exclude) {
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : [exclude])
  const candidates = pool.filter((v) => v != null && !excludeSet.has(v))
  // Dedupe candidates first so a pool with duplicates can't pad the count.
  const unique = Array.from(new Set(candidates))
  if (unique.length < count) return null

  // Fisher-Yates partial shuffle
  const arr = unique.slice()
  for (let i = arr.length - 1; i > arr.length - 1 - count; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(arr.length - count)
}

/**
 * Pick 3 plausible-but-wrong rank integers in [1, 32] avoiding `actualRank`.
 * Samples one each from top-5, mid-tier (#10-22), and bottom-5 buckets to
 * give the user a meaningful spread. Falls back to a wider sample if a
 * bucket is empty after exclusion.
 */
function pickRankDistractors(actualRank) {
  const buckets = [
    [1, 2, 3, 4, 5],                  // top-5
    [10, 12, 14, 16, 18, 20, 22],     // mid-tier
    [28, 29, 30, 31, 32],             // bottom-5
  ]
  const chosen = []
  const used = new Set([actualRank])

  for (const bucket of buckets) {
    const available = bucket.filter((r) => !used.has(r))
    if (available.length === 0) continue
    const pick = available[Math.floor(Math.random() * available.length)]
    chosen.push(pick)
    used.add(pick)
  }

  // If a bucket couldn't contribute (e.g., actualRank=1 wipes top-5 down to 4
  // items but we still need a unique), pad from the full 1-32 range.
  while (chosen.length < 3) {
    const all = []
    for (let r = 1; r <= 32; r++) if (!used.has(r)) all.push(r)
    if (all.length === 0) return null
    const pick = all[Math.floor(Math.random() * all.length)]
    chosen.push(pick)
    used.add(pick)
  }

  return chosen.map((r) => `#${r}`)
}

/** Friendly team name: "Buffalo Bills".
 *  NflTeam.name in some data sources already includes the city ("New York
 *  Jets"). Guard against double-printing the city.
 */
function teamFullName(team) {
  if (!team?.name) return team?.abbreviation ?? ''
  if (team.city && team.name.toLowerCase().includes(team.city.toLowerCase())) {
    return team.name
  }
  return `${team.city ?? ''} ${team.name}`.trim()
}

/**
 * Build a coaching-role template. Used for HC, OC, DC.
 */
function buildCoachingTemplate({ name, role, roleLabel }) {
  return {
    name,
    category: 'coaching',
    difficulty: 1,
    async generate(spine) {
      const cards = []
      // Pool: all names in this role across the league.
      const allNamesInRole = spine.coachingStaff
        .filter((c) => c.role === role)
        .map((c) => c.name)

      for (const team of spine.teams) {
        const staff = spine.coachingStaff.find(
          (c) => c.teamId === team.id && c.role === role
        )
        if (!staff || !staff.name) continue

        const distractors = pickDistinctRandom(allNamesInRole, 3, staff.name)
        if (!distractors) continue

        cards.push({
          templateName: name,
          subject: team.abbreviation,
          question: `Who is the ${teamFullName(team)}' ${roleLabel}?`,
          answer: staff.name,
          distractors,
          difficulty: 1,
          category: 'coaching',
          meta: { teamId: team.id, role, season: staff.season },
        })
      }

      return cards
    },
  }
}

/**
 * Build a starting-position-player template. Used for QB1, RB1, WR1, TE1.
 */
function buildStarterTemplate({ name, position, label }) {
  return {
    name,
    category: 'roster',
    difficulty: 2,
    async generate(spine) {
      const cards = []

      // Pool: all current starters at this position across the league
      // (excluding the team's own starter when generating that team's card).
      // We pick the LOWEST depthRank per team for the position to define
      // "the starter" — same logic used per-team below.
      const startersByTeam = new Map() // teamId -> { playerId, playerName }
      for (const slot of spine.rosterSlots) {
        if (slot.position !== position) continue
        if (slot.status !== 'active') continue
        const existing = startersByTeam.get(slot.teamId)
        if (!existing || slot.depthRank < existing.depthRank) {
          startersByTeam.set(slot.teamId, {
            depthRank: slot.depthRank,
            playerName: slot.player?.name || null,
          })
        }
      }

      // Cross-team distractor pool: all starter names for the position.
      const allStarterNames = Array.from(startersByTeam.values())
        .map((s) => s.playerName)
        .filter(Boolean)

      for (const team of spine.teams) {
        const starter = startersByTeam.get(team.id)
        if (!starter || !starter.playerName) continue

        const distractors = pickDistinctRandom(
          allStarterNames,
          3,
          starter.playerName
        )
        if (!distractors) continue

        cards.push({
          templateName: name,
          subject: team.abbreviation,
          question: `Who is the ${teamFullName(team)}' starting ${label} entering 2026?`,
          answer: starter.playerName,
          distractors,
          difficulty: 2,
          category: 'roster',
          meta: { teamId: team.id, position, depthRank: starter.depthRank },
        })
      }

      return cards
    },
  }
}

/**
 * Build a unit-rank template. Used for OL, DL.
 * Pulls from season=2025 NflTeamUnitRank (most recent COMPLETED season).
 */
function buildRankTemplate({ name, unit, label }) {
  return {
    name,
    category: 'ranks',
    difficulty: 3,
    async generate(spine) {
      const cards = []
      const ranksByTeam = new Map() // teamId -> rank
      for (const r of spine.unitRanks) {
        if (r.unit !== unit) continue
        if (r.season !== 2025) continue
        ranksByTeam.set(r.teamId, r.rank)
      }

      for (const team of spine.teams) {
        const rank = ranksByTeam.get(team.id)
        if (!Number.isFinite(rank)) continue

        const distractors = pickRankDistractors(rank)
        if (!distractors) continue

        cards.push({
          templateName: name,
          subject: team.abbreviation,
          question: `What is the ${teamFullName(team)}' ${label} rank entering 2026?`,
          answer: `#${rank}`,
          distractors,
          difficulty: 3,
          category: 'ranks',
          meta: { teamId: team.id, unit, season: 2025 },
        })
      }

      return cards
    },
  }
}

const TEMPLATES = [
  // Coaching (difficulty 1)
  buildCoachingTemplate({ name: 'team_hc', role: 'HC', roleLabel: 'head coach' }),
  buildCoachingTemplate({ name: 'team_oc', role: 'OC', roleLabel: 'offensive coordinator' }),
  buildCoachingTemplate({ name: 'team_dc', role: 'DC', roleLabel: 'defensive coordinator' }),

  // Roster starters (difficulty 2)
  buildStarterTemplate({ name: 'team_qb1', position: 'QB', label: 'QB' }),
  buildStarterTemplate({ name: 'team_rb1', position: 'RB', label: 'RB' }),
  buildStarterTemplate({ name: 'team_wr1', position: 'WR', label: 'WR' }),
  buildStarterTemplate({ name: 'team_te1', position: 'TE', label: 'TE' }),

  // Unit ranks (difficulty 3)
  buildRankTemplate({ name: 'team_ol_rank', unit: 'OL', label: 'offensive line' }),
  buildRankTemplate({ name: 'team_dl_rank', unit: 'DL', label: 'defensive line' }),
]

module.exports = { TEMPLATES, pickDistinctRandom, pickRankDistractors }
