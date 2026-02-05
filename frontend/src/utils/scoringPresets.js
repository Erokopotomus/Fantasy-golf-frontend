// Scoring preset constants - mirrors backend scoringService.js

export const STANDARD_CONFIG = {
  preset: 'standard',
  positionPoints: {
    1: 30, 2: 20, 3: 18, 4: 16, 5: 14,
    6: 12, 7: 10, 8: 9, 9: 8, 10: 7,
    11: 6, 12: 5, 13: 5, 14: 4, 15: 4,
    16: 3, 17: 3, 18: 3, 19: 2, 20: 2,
    top25: 1.5, top30: 1, madeCut: 0.5, missedCut: -2,
  },
  holeScoring: {
    holeInOne: 5,
    eagle: 5,
    birdie: 3,
    par: 0,
    bogey: -1,
    doubleBogey: -2,
    worseThanDouble: -3,
  },
  bonuses: {
    bogeyFreeRound: 3,
    birdieStreak3: 3,
    under70Round: 0.5,
  },
  strokesGained: {
    enabled: false,
    multiplier: 5,
  },
}

export const DRAFTKINGS_CONFIG = {
  preset: 'draftkings',
  positionPoints: {
    1: 10, 2: 8, 3: 7, 4: 6, 5: 5,
    6: 4, 7: 3, 8: 2.5, 9: 2, 10: 1.5,
    11: 1, 12: 1, 13: 1, 14: 0.5, 15: 0.5,
    16: 0.5, 17: 0, 18: 0, 19: 0, 20: 0,
    top25: 0, top30: 0, madeCut: 0, missedCut: -1,
  },
  holeScoring: {
    holeInOne: 10,
    eagle: 8,
    birdie: 3,
    par: 0.5,
    bogey: -0.5,
    doubleBogey: -1,
    worseThanDouble: -1.5,
  },
  bonuses: {
    bogeyFreeRound: 3,
    birdieStreak3: 3,
    under70Round: 0,
  },
  strokesGained: {
    enabled: false,
    multiplier: 5,
  },
}

export function getDefaultScoringConfig(preset = 'standard') {
  switch (preset) {
    case 'draftkings':
      return JSON.parse(JSON.stringify(DRAFTKINGS_CONFIG))
    case 'custom':
      return JSON.parse(JSON.stringify(STANDARD_CONFIG))
    case 'standard':
    default:
      return JSON.parse(JSON.stringify(STANDARD_CONFIG))
  }
}

// Labels for position points grid
export const POSITION_LABELS = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th',
  6: '6th', 7: '7th', 8: '8th', 9: '9th', 10: '10th',
  11: '11th', 12: '12th', 13: '13th', 14: '14th', 15: '15th',
  16: '16th', 17: '17th', 18: '18th', 19: '19th', 20: '20th',
  top25: 'Top 25', top30: 'Top 30', madeCut: 'Made Cut', missedCut: 'Missed Cut',
}

export const HOLE_SCORING_LABELS = {
  holeInOne: 'Hole-in-One',
  eagle: 'Eagle',
  birdie: 'Birdie',
  par: 'Par',
  bogey: 'Bogey',
  doubleBogey: 'Double Bogey',
  worseThanDouble: 'Triple+',
}

export const BONUS_LABELS = {
  bogeyFreeRound: 'Bogey-Free Round',
  birdieStreak3: '3+ Birdie Streak',
  under70Round: 'Under 70 (per stroke)',
}

/**
 * Calculate a preview fantasy score for a hypothetical performance
 */
export function calculatePreviewPoints(config) {
  // Hypothetical: 5th place, 22 birdies, 38 pars, 8 bogeys, 2 eagles, 1 bogey-free round
  const sample = {
    position: 5,
    status: 'ACTIVE',
    eagles: 2,
    birdies: 22,
    pars: 38,
    bogeys: 8,
    doubleBogeys: 1,
    worseThanDouble: 0,
    holesInOne: 0,
    sgTotal: 1.5,
    roundScores: [
      { score: 68, bogeyFree: true, consecutiveBirdies: 3 },
      { score: 70, bogeyFree: false, consecutiveBirdies: 1 },
      { score: 69, bogeyFree: false, consecutiveBirdies: 2 },
      { score: 71, bogeyFree: false, consecutiveBirdies: 0 },
    ],
  }

  let positionPts = 0
  const pos = sample.position
  if (config.positionPoints[pos] !== undefined) {
    positionPts = config.positionPoints[pos]
  }

  const hs = config.holeScoring
  const holePts =
    (sample.holesInOne || 0) * (hs.holeInOne || 0) +
    sample.eagles * (hs.eagle || 0) +
    sample.birdies * (hs.birdie || 0) +
    sample.pars * (hs.par || 0) +
    sample.bogeys * (hs.bogey || 0) +
    sample.doubleBogeys * (hs.doubleBogey || 0) +
    (sample.worseThanDouble || 0) * (hs.worseThanDouble || 0)

  let bonusPts = 0
  for (const round of sample.roundScores) {
    if (round.bogeyFree && config.bonuses?.bogeyFreeRound) bonusPts += config.bonuses.bogeyFreeRound
    if (round.consecutiveBirdies >= 3 && config.bonuses?.birdieStreak3) bonusPts += config.bonuses.birdieStreak3
    if (round.score < 70 && config.bonuses?.under70Round) bonusPts += config.bonuses.under70Round * (70 - round.score)
  }

  let sgPts = 0
  if (config.strokesGained?.enabled) {
    sgPts = sample.sgTotal * (config.strokesGained.multiplier || 5)
  }

  const total = Math.round((positionPts + holePts + bonusPts + sgPts) * 100) / 100

  return {
    total,
    position: positionPts,
    holes: Math.round(holePts * 100) / 100,
    bonuses: Math.round(bonusPts * 100) / 100,
    strokesGained: Math.round(sgPts * 100) / 100,
    sample,
  }
}
