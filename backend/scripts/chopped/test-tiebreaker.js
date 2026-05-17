const { resolveTiebreaker, describeTiebreaker } = require('../../src/services/chopped/tiebreaker');

// Case 1: cumulative breaks the tie
let result = resolveTiebreaker({
  tiedTeams: [
    { teamId: 'A', cumulativePoints: 1100, pointDifferential: 50 },
    { teamId: 'B', cumulativePoints: 1050, pointDifferential: 30 },  // worst cumulative
    { teamId: 'C', cumulativePoints: 1200, pointDifferential: 80 },
  ],
  leagueId: 'lg1',
  week: 5,
});
if (result[0].teamId !== 'B') throw new Error(`Cumulative tie: expected B first, got ${result[0].teamId}`);

// Case 2: cumulative equal → point differential breaks tie
result = resolveTiebreaker({
  tiedTeams: [
    { teamId: 'A', cumulativePoints: 1000, pointDifferential: 50 },
    { teamId: 'B', cumulativePoints: 1000, pointDifferential: -100 },  // worst diff
    { teamId: 'C', cumulativePoints: 1000, pointDifferential: 0 },
  ],
  leagueId: 'lg1',
  week: 5,
});
if (result[0].teamId !== 'B') throw new Error(`Diff tie: expected B first, got ${result[0].teamId}`);

// Case 3: full tie → deterministic coinflip — same input twice = same result
const tied = [
  { teamId: 'X', cumulativePoints: 1000, pointDifferential: 50 },
  { teamId: 'Y', cumulativePoints: 1000, pointDifferential: 50 },
];
const r1 = resolveTiebreaker({ tiedTeams: tied, leagueId: 'lg1', week: 5 });
const r2 = resolveTiebreaker({ tiedTeams: tied, leagueId: 'lg1', week: 5 });
if (r1[0].teamId !== r2[0].teamId) throw new Error('Coinflip should be deterministic');

// Case 4: describeTiebreaker classification
const loser = { teamId: 'B', weeklyPoints: 85, cumulativePoints: 1050, pointDifferential: 30 };
const others = [{ teamId: 'A', weeklyPoints: 85, cumulativePoints: 1100, pointDifferential: 50 }];
const desc = describeTiebreaker(loser, others);
if (desc !== 'cumulative_pts') throw new Error(`describe: expected cumulative_pts, got ${desc}`);

console.log('✓ tiebreaker passed');
