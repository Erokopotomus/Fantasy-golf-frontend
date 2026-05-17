const { computeSafePercentsFromTeams } = require('../../src/services/chopped/safePercentService');

// 3 synthetic teams: clear leader (120, σ=10), middle (95, σ=10), clear loser (70, σ=10)
// Spread chosen so the pairwise product safe% comfortably exceeds the
// 0.90 / 0.20 thresholds (a 25-point margin → Φ(1.77)·Φ(3.18) ≈ 0.96).
const teams = [
  { teamId: 'A', mean: 120, variance: 100 },
  { teamId: 'B', mean: 95, variance: 100 },
  { teamId: 'C', mean: 70, variance: 100 },
];
const result = computeSafePercentsFromTeams(teams);
console.log(JSON.stringify(result, null, 2));

const a = result.find(r => r.teamId === 'A');
const c = result.find(r => r.teamId === 'C');

if (a.safePct <= 0.90) throw new Error(`Leader safePct = ${a.safePct}, expected > 0.90`);
if (c.safePct >= 0.20) throw new Error(`Loser safePct = ${c.safePct}, expected < 0.20`);
if (a.rank !== 1) throw new Error(`Leader rank = ${a.rank}, expected 1`);
if (c.rank !== 3) throw new Error(`Loser rank = ${c.rank}, expected 3`);

// Identical teams should get identical results
const identical = computeSafePercentsFromTeams([
  { teamId: 'X', mean: 100, variance: 100 },
  { teamId: 'Y', mean: 100, variance: 100 },
]);
if (Math.abs(identical[0].safePct - identical[1].safePct) > 0.001) {
  throw new Error('Identical teams should have identical safePct');
}

console.log('✓ pairwise safe % logic passed');
