/**
 * Shared characteristic metadata — single source of truth for the 19
 * Manager Intelligence characteristics.
 *
 * Consumers:
 *   - backend/src/routes/adminIntelligence.js (admin UI: Library, Detail, User Profile)
 *   - backend/src/services/intelligence/coachPromotion.js (MI -> Coach Vault bridge)
 *
 * Each entry carries:
 *   - displayName  : human label for UI + vault facts
 *   - description  : tooltip / context line
 *   - category     : groups characteristics for promotion routing
 *                    (see CATEGORY_TO_DOCUMENT_TYPE below)
 *
 * When adding a new extractor, add its meta here so admin UI + coach
 * promotion stay in sync.
 */

const CHARACTERISTIC_META = {
  // pick_quality (4)
  pick_reach_rate: {
    displayName: 'Pick Reach Rate',
    description: 'How often the manager picks players notably earlier than ADP',
    category: 'pick_quality',
  },
  pick_steal_rate: {
    displayName: 'Pick Steal Rate',
    description: 'How often the manager picks players notably later than ADP (value)',
    category: 'pick_quality',
  },
  pick_par_rate: {
    displayName: 'Pick Par Rate',
    description: 'How often the manager picks players in line with their ADP',
    category: 'pick_quality',
  },
  pick_value_rate: {
    displayName: 'Pick Value Rate',
    description: 'How often the manager pulls strong-value picks across all rounds',
    category: 'pick_quality',
  },
  // positional (2)
  r1_position_distribution: {
    displayName: 'Round 1 Position Distribution',
    description: 'Which positions the manager favors with their first-round pick',
    category: 'positional',
  },
  position_round_profile: {
    displayName: 'Position Round Profile',
    description: 'Manager-specific timing for drafting each position vs league baseline',
    category: 'positional',
  },
  // auction (3)
  auction_overpay_rate: {
    displayName: 'Auction Overpay Rate',
    description: 'How often the manager bids notably above market value',
    category: 'auction',
  },
  auction_bargain_rate: {
    displayName: 'Auction Bargain Rate',
    description: 'How often the manager lands players for notably below market value',
    category: 'auction',
  },
  auction_spend_concentration: {
    displayName: 'Auction Spend Concentration',
    description: 'How concentrated the manager spends budget on top players (stars vs scrubs)',
    category: 'auction',
  },
  // trade (2)
  trade_frequency: {
    displayName: 'Trade Frequency',
    description: 'How often the manager engages in trades per season',
    category: 'trade',
  },
  roster_endowment_ratio: {
    displayName: 'Roster Endowment Ratio',
    description: 'How tightly the manager holds drafted players vs churns them',
    category: 'trade',
  },
  // waiver (2)
  faab_front_load_pct: {
    displayName: 'FAAB Front-Load %',
    description: 'How aggressively the manager spends FAAB budget early in the season',
    category: 'waiver',
  },
  top_bid_rate: {
    displayName: 'Top Bid Rate',
    description: 'How often the manager places the winning top bid on a waiver target',
    category: 'waiver',
  },
  // drop (2)
  naked_drop_frequency: {
    displayName: 'Naked Drop Frequency',
    description: 'How often the manager drops players without picking up a replacement',
    category: 'drop',
  },
  drop_lag_games: {
    displayName: 'Drop Lag Games',
    description: 'How long the manager holds underperformers before dropping them',
    category: 'drop',
  },
  // outcome (4)
  finish_volatility: {
    displayName: 'Finish Volatility',
    description: 'Season-over-season variance in final standings — boom/bust manager',
    category: 'outcome',
  },
  championship_rate: {
    displayName: 'Championship Rate',
    description: 'Lifetime championships won per season played',
    category: 'outcome',
  },
  playoff_rate: {
    displayName: 'Playoff Rate',
    description: 'Lifetime playoff appearances per season played',
    category: 'outcome',
  },
  career_trajectory_slope: {
    displayName: 'Career Trajectory Slope',
    description: 'Year-over-year improvement direction in final standings',
    category: 'outcome',
  },
}

/**
 * Maps each characteristic category to the CoachingMemory.documentType
 * that should receive its facts when promoteToCoach=true.
 *
 *   draft_patterns    : how the user drafts (pick_quality, positional, auction)
 *   roster_patterns   : how the user manages their roster mid-season (trade, waiver, drop)
 *   season_narrative  : how the user's seasons play out (outcome)
 *
 * Categories not mapped here are intentionally excluded from the vault.
 */
const CATEGORY_TO_DOCUMENT_TYPE = {
  pick_quality: 'draft_patterns',
  positional: 'draft_patterns',
  auction: 'draft_patterns',
  trade: 'roster_patterns',
  waiver: 'roster_patterns',
  drop: 'roster_patterns',
  outcome: 'season_narrative',
}

module.exports = {
  CHARACTERISTIC_META,
  CATEGORY_TO_DOCUMENT_TYPE,
}
