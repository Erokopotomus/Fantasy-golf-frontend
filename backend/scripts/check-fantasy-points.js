const { computeHalfPpr } = require('../src/services/nfl/computeFantasyPoints')

// Synthetic Josh Allen 2023 Week 1 stat line
const allenRow = {
  passing_yards: 236, passing_tds: 3, passing_interceptions: 1,
  rushing_yards: 36, rushing_tds: 0,
  receptions: 0,
}
// 236*0.04 + 3*4 + (-1)*2 + 36*0.1 + 0 = 9.44 + 12 - 2 + 3.6 = 23.04
console.log('Allen expected ~23.04, got:', computeHalfPpr(allenRow).toFixed(2))

// Synthetic CMC stat line
const cmcRow = {
  rushing_yards: 152, rushing_tds: 1,
  receiving_yards: 30, receiving_tds: 0, receptions: 4,
}
// 152*0.1 + 6 + 30*0.1 + 0 + 4*0.5 = 15.2 + 6 + 3 + 2 = 26.2
console.log('CMC expected ~26.20, got:', computeHalfPpr(cmcRow).toFixed(2))
