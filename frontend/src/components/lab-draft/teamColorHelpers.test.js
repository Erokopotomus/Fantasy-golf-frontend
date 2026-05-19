import { describe, it, expect } from 'vitest'
import { teamPrimary, teamBlend } from './teamColorHelpers'

describe('teamPrimary', () => {
  it('returns the team color when abbr is known', () => {
    expect(teamPrimary('KC')).toBe('#E31837')
  })
  it('returns blaze fallback when abbr is unknown', () => {
    expect(teamPrimary('XXX')).toBe('#F06820')
  })
  it('returns blaze fallback when abbr is null', () => {
    expect(teamPrimary(null)).toBe('#F06820')
  })
})

describe('teamBlend', () => {
  it('returns blaze when no abbrs provided', () => {
    expect(teamBlend([])).toBe('#F06820')
    expect(teamBlend(null)).toBe('#F06820')
  })
  it('returns a single team color when only one abbr', () => {
    expect(teamBlend(['KC'])).toBe('#E31837')
  })
  it('returns a hex string when multiple abbrs', () => {
    const blend = teamBlend(['KC', 'BUF'])
    expect(blend).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
