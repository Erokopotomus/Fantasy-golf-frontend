const { normalCdf, teamVariance } = require('../../src/services/chopped/variance');

// Sanity: normalCdf(0) ≈ 0.5
const mid = normalCdf(0);
if (Math.abs(mid - 0.5) > 0.001) throw new Error(`normalCdf(0) = ${mid}, expected ~0.5`);

// normalCdf(1.96) ≈ 0.975 (1-sided 95% confidence)
const upper = normalCdf(1.96);
if (Math.abs(upper - 0.975) > 0.001) throw new Error(`normalCdf(1.96) = ${upper}, expected ~0.975`);

// normalCdf(-1.96) ≈ 0.025
const lower = normalCdf(-1.96);
if (Math.abs(lower - 0.025) > 0.001) throw new Error(`normalCdf(-1.96) = ${lower}, expected ~0.025`);

// teamVariance: 1 QB + 2 RB + 2 WR + 1 TE + 1 K + 1 DST
const starters = [
  { position: 'QB' }, { position: 'RB' }, { position: 'RB' },
  { position: 'WR' }, { position: 'WR' }, { position: 'TE' },
  { position: 'K' }, { position: 'DST' },
];
const v = teamVariance(starters);
// 64 + 49 + 49 + 81 + 81 + 36 + 16 + 36 = 412
const expected = 412;
if (v !== expected) throw new Error(`teamVariance = ${v}, expected ${expected}`);

// Unknown position should fall back to 7.0 (variance 49)
const fallback = teamVariance([{ position: 'WTF' }]);
if (fallback !== 49) throw new Error(`fallback teamVariance = ${fallback}, expected 49`);

console.log('✓ variance helpers passed');
