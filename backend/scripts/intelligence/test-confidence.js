const { computeConfidenceScore, computeLabel } = require('../../src/services/intelligence/confidence')

// HIGH case
const high = { sampleSize: 10, consistencyPct: 0.9, effectSize: 1.5 }
const highScore = computeConfidenceScore(high)
const highLabel = computeLabel(high)
console.log('HIGH:', highScore, highLabel)
if (highLabel !== 'HIGH') throw new Error(`expected HIGH, got ${highLabel}`)
if (highScore < 60) throw new Error(`expected HIGH score > 60, got ${highScore}`)

// MEDIUM case
const med = { sampleSize: 4, consistencyPct: 0.65, effectSize: 0.8 }
const medLabel = computeLabel(med)
console.log('MED:', computeConfidenceScore(med), medLabel)
if (medLabel !== 'MEDIUM') throw new Error(`expected MEDIUM, got ${medLabel}`)

// LOW case
const low = { sampleSize: 2, consistencyPct: 0.5, effectSize: 0.3 }
const lowLabel = computeLabel(low)
console.log('LOW:', computeConfidenceScore(low), lowLabel)
if (lowLabel !== 'LOW') throw new Error(`expected LOW, got ${lowLabel}`)

// Edge: consistency given as percentage 0-100 instead of 0-1
const pct = computeConfidenceScore({ sampleSize: 10, consistencyPct: 90, effectSize: 1.5 })
const dec = computeConfidenceScore({ sampleSize: 10, consistencyPct: 0.9, effectSize: 1.5 })
if (Math.abs(pct - dec) > 0.5) throw new Error(`percentage vs decimal mismatch: ${pct} vs ${dec}`)

// Threshold override
const customThresholds = { highMinN: 20, highMinConsistency: 0.95, medMinN: 10, medMinConsistency: 0.80 }
const overrideLabel = computeLabel({ sampleSize: 10, consistencyPct: 0.9, effectSize: 1.5 }, customThresholds)
console.log('Override:', overrideLabel)
if (overrideLabel !== 'MEDIUM') throw new Error(`with custom thresholds expected MEDIUM, got ${overrideLabel}`)

console.log('✓ confidence helpers passed')
