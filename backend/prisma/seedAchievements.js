/**
 * Seed Achievements
 *
 * Populates the achievements table with 30+ achievement definitions.
 * Run: node prisma/seedAchievements.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ACHIEVEMENTS = [
  // ─── SEASON (8) ──────────────────────────────────────────────────────────────
  {
    slug: 'first-championship',
    name: 'First Championship',
    description: 'Win your first league championship',
    tier: 'BRONZE',
    icon: '🏆',
    category: 'SEASON',
    criteria: { type: 'championships', threshold: 1 },
  },
  {
    slug: 'back-to-back',
    name: 'Back to Back',
    description: 'Win championships in consecutive seasons',
    tier: 'GOLD',
    icon: '🏆🏆',
    category: 'SEASON',
    criteria: { type: 'consecutive_championships', threshold: 2 },
  },
  {
    slug: 'three-peat',
    name: 'Three-Peat',
    description: 'Win three championships in a row',
    tier: 'PLATINUM',
    icon: '👑',
    category: 'SEASON',
    criteria: { type: 'consecutive_championships', threshold: 3 },
  },
  {
    slug: 'dynasty',
    name: 'Dynasty',
    description: 'Win four or more championships in a row',
    tier: 'PLATINUM',
    icon: '🏰',
    category: 'SEASON',
    isHidden: true,
    criteria: { type: 'consecutive_championships', threshold: 4 },
  },
  {
    slug: 'worst-to-first',
    name: 'Worst to First',
    description: 'Finish last one season and win the championship the next',
    tier: 'GOLD',
    icon: '🚀',
    category: 'SEASON',
    criteria: { type: 'worst_to_first' },
  },
  {
    slug: 'undefeated-week',
    name: 'Undefeated Machine',
    description: 'Go undefeated for an entire season in H2H',
    tier: 'PLATINUM',
    icon: '💎',
    category: 'SEASON',
    isHidden: true,
    criteria: { type: 'undefeated_season' },
  },
  {
    slug: 'podium-finish',
    name: 'Podium Finish',
    description: 'Finish in the top 3 of a league',
    tier: 'BRONZE',
    icon: '🥉',
    category: 'SEASON',
    criteria: { type: 'best_finish', threshold: 3 },
  },
  {
    slug: 'iron-man',
    name: 'Iron Man',
    description: 'Complete a full season without missing a week',
    tier: 'SILVER',
    icon: '🦾',
    category: 'SEASON',
    criteria: { type: 'full_season_participation' },
  },

  // ─── DRAFT (6) ───────────────────────────────────────────────────────────────
  {
    slug: 'draft-steal',
    name: 'Draft Steal',
    description: 'Draft a player who outperforms their ADP by 50+ positions',
    tier: 'SILVER',
    icon: '🥷',
    category: 'DRAFT',
    criteria: { type: 'draft_value_vs_adp', threshold: 50 },
  },
  {
    slug: 'draft-bust',
    name: 'Draft Bust',
    description: 'Draft a first-round pick who finishes outside the top 50',
    tier: 'BRONZE',
    icon: '💀',
    category: 'DRAFT',
    criteria: { type: 'first_round_bust', threshold: 50 },
  },
  {
    slug: 'auction-sniper',
    name: 'Auction Sniper',
    description: 'Best points-per-dollar ratio in an auction draft',
    tier: 'GOLD',
    icon: '🎯',
    category: 'DRAFT',
    criteria: { type: 'best_auction_roi' },
  },
  {
    slug: 'bargain-hunter',
    name: 'Bargain Hunter',
    description: 'Win a championship spending less than 80% of auction budget',
    tier: 'GOLD',
    icon: '💰',
    category: 'DRAFT',
    criteria: { type: 'champion_under_budget', threshold: 0.8 },
  },
  {
    slug: 'draft-day-genius',
    name: 'Draft Day Genius',
    description: 'Draft 3+ players who finish in the top 20',
    tier: 'SILVER',
    icon: '🧠',
    category: 'DRAFT',
    criteria: { type: 'top_draft_picks', count: 3, threshold: 20 },
  },
  {
    slug: 'autodraft-king',
    name: 'Autodraft King',
    description: 'Win a championship with 50%+ autodrafted picks',
    tier: 'GOLD',
    icon: '🤖',
    category: 'DRAFT',
    isHidden: true,
    criteria: { type: 'champion_with_autopicks', threshold: 0.5 },
  },

  // ─── LINEUP (6) ──────────────────────────────────────────────────────────────
  {
    slug: 'perfect-lineup',
    name: 'Perfect Lineup',
    description: 'Set the optimal lineup for a week (actual = optimal)',
    tier: 'GOLD',
    icon: '✨',
    category: 'LINEUP',
    criteria: { type: 'perfect_lineup' },
  },
  {
    slug: 'bench-boss',
    name: 'Bench Boss',
    description: 'Have the most bench points in your league in a single week',
    tier: 'BRONZE',
    icon: '🪑',
    category: 'LINEUP',
    criteria: { type: 'most_bench_points_week' },
  },
  {
    slug: 'points-explosion',
    name: 'Points Explosion',
    description: 'Score 2x the league average in a single week',
    tier: 'SILVER',
    icon: '💥',
    category: 'LINEUP',
    criteria: { type: 'score_multiplier_week', threshold: 2.0 },
  },
  {
    slug: 'weekly-high-scorer',
    name: 'Weekly High Scorer',
    description: 'Score the most points in your league in a single week',
    tier: 'BRONZE',
    icon: '📈',
    category: 'LINEUP',
    criteria: { type: 'weekly_high_scorer' },
  },
  {
    slug: 'consistent-contender',
    name: 'Consistent Contender',
    description: 'Finish in the top 3 weekly scorers for 5 consecutive weeks',
    tier: 'SILVER',
    icon: '📊',
    category: 'LINEUP',
    criteria: { type: 'consecutive_top_finishes', rank: 3, threshold: 5 },
  },
  {
    slug: 'lineup-optimizer',
    name: 'Lineup Optimizer',
    description: 'Set the optimal lineup 5 weeks in a row',
    tier: 'PLATINUM',
    icon: '🔬',
    category: 'LINEUP',
    criteria: { type: 'consecutive_perfect_lineups', threshold: 5 },
  },

  // ─── SOCIAL (5) ──────────────────────────────────────────────────────────────
  {
    slug: 'trade-master',
    name: 'Trade Master',
    description: 'Complete 3+ trades that result in net positive fantasy points',
    tier: 'SILVER',
    icon: '🤝',
    category: 'SOCIAL',
    criteria: { type: 'winning_trades', threshold: 3 },
  },
  {
    slug: 'waiver-warrior',
    name: 'Waiver Warrior',
    description: 'Pick up a free agent who becomes a top-10 performer',
    tier: 'SILVER',
    icon: '⚔️',
    category: 'SOCIAL',
    criteria: { type: 'waiver_pickup_top_performer', threshold: 10 },
  },
  {
    slug: 'league-hopper',
    name: 'League Hopper',
    description: 'Participate in 5+ leagues across any number of seasons',
    tier: 'BRONZE',
    icon: '🐇',
    category: 'SOCIAL',
    criteria: { type: 'total_leagues', threshold: 5 },
  },
  {
    slug: 'commissioner-club',
    name: 'Commissioner Club',
    description: 'Run 3+ leagues as commissioner',
    tier: 'SILVER',
    icon: '🎩',
    category: 'SOCIAL',
    criteria: { type: 'leagues_as_commissioner', threshold: 3 },
  },
  {
    slug: 'rivalry',
    name: 'Heated Rivalry',
    description: 'Face the same opponent 10+ times in H2H matchups',
    tier: 'BRONZE',
    icon: '🔥',
    category: 'SOCIAL',
    criteria: { type: 'h2h_matchups_vs_opponent', threshold: 10 },
  },

  // ─── MILESTONE (7) ───────────────────────────────────────────────────────────
  {
    slug: 'century-club',
    name: 'Century Club',
    description: 'Accumulate 100+ career wins',
    tier: 'GOLD',
    icon: '💯',
    category: 'MILESTONE',
    criteria: { type: 'career_wins', threshold: 100 },
  },
  {
    slug: 'first-win',
    name: 'First Win',
    description: 'Win your first H2H matchup',
    tier: 'BRONZE',
    icon: '🎉',
    category: 'MILESTONE',
    criteria: { type: 'career_wins', threshold: 1 },
  },
  {
    slug: 'thousand-points',
    name: 'Thousand Points',
    description: 'Score 1000+ fantasy points in a single season',
    tier: 'SILVER',
    icon: '🔢',
    category: 'MILESTONE',
    criteria: { type: 'season_points', threshold: 1000 },
  },
  {
    slug: 'veteran',
    name: 'Veteran',
    description: 'Complete 5+ fantasy seasons',
    tier: 'SILVER',
    icon: '🎖️',
    category: 'MILESTONE',
    criteria: { type: 'total_seasons', threshold: 5 },
  },
  {
    slug: 'multi-sport',
    name: 'Multi-Sport Manager',
    description: 'Participate in leagues across 2+ different sports',
    tier: 'SILVER',
    icon: '🏅',
    category: 'MILESTONE',
    criteria: { type: 'sports_played', threshold: 2 },
  },
  {
    slug: 'ten-leagues',
    name: 'League Legend',
    description: 'Participate in 10+ leagues lifetime',
    tier: 'GOLD',
    icon: '⭐',
    category: 'MILESTONE',
    criteria: { type: 'total_leagues', threshold: 10 },
  },
  {
    slug: 'win-streak-five',
    name: 'Hot Streak',
    description: 'Win 5+ consecutive H2H matchups',
    tier: 'SILVER',
    icon: '🔥',
    category: 'MILESTONE',
    criteria: { type: 'win_streak', threshold: 5 },
  },
]

async function main() {
  console.log('Seeding achievements...')

  let created = 0
  let skipped = 0

  for (const ach of ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({ where: { slug: ach.slug } })
    if (existing) {
      skipped++
      continue
    }

    await prisma.achievement.create({
      data: {
        slug: ach.slug,
        name: ach.name,
        description: ach.description,
        tier: ach.tier,
        icon: ach.icon || null,
        category: ach.category,
        isHidden: ach.isHidden || false,
        criteria: ach.criteria || {},
        // sportId left null (cross-sport achievements)
      },
    })
    created++
  }

  console.log(`Achievements seeded: ${created} created, ${skipped} already existed`)
  console.log(`Total achievements: ${await prisma.achievement.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
