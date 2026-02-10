/**
 * storylineGenerator.js — Pure utility for generating editorial narratives
 * from existing tournament/course/player data.
 *
 * No API calls, no side effects — just data in, prose out.
 */

// ── Course Narrative ──────────────────────────────────────────────

const skillNames = {
  driving: 'driving',
  approach: 'approach play',
  aroundGreen: 'short game',
  putting: 'putting',
}

const skillDescriptors = {
  driving: ['big hitters', 'bombers', 'long-ball players'],
  approach: ['iron players', 'precision ball-strikers', 'approach specialists'],
  aroundGreen: ['short-game wizards', 'scrambling artists', 'wedge specialists'],
  putting: ['elite putters', 'flat-stick magicians', 'players who can roll it'],
}

function getDnaSkills(course) {
  const raw = [
    { key: 'driving', value: course.drivingImportance },
    { key: 'approach', value: course.approachImportance },
    { key: 'aroundGreen', value: course.aroundGreenImportance },
    { key: 'putting', value: course.puttingImportance },
  ].filter(d => d.value != null)

  return raw.sort((a, b) => b.value - a.value)
}

export function generateCourseNarrative(course) {
  if (!course) return null

  const skills = getDnaSkills(course)
  if (skills.length === 0) return null

  const premium = skills.filter(s => s.value >= 0.27)
  const top = skills[0]
  const courseName = course.nickname || course.name || 'This course'

  if (premium.length === 0) {
    return `${courseName} is a balanced test that doesn't overly favor any single skill. Consistency across all facets of the game is the key to contending here.`
  }

  if (premium.length === 1) {
    const desc = skillDescriptors[top.key]
    const pick = desc[Math.floor(courseName.length % desc.length)]
    return `${courseName} rewards ${skillNames[top.key]} above all else. Expect ${pick} to have a significant edge this week. Players who struggle ${top.key === 'putting' ? 'on the greens' : top.key === 'driving' ? 'off the tee' : `with their ${skillNames[top.key]}`} will find it difficult to contend.`
  }

  if (premium.length === 2) {
    const second = premium[1]
    return `${courseName} places a premium on ${skillNames[top.key]} and ${skillNames[second.key]}. Winners here tend to be ${skillDescriptors[top.key][0]} who also excel ${second.key === 'putting' ? 'on the greens' : `with their ${skillNames[second.key]}`}. If you can do both at a high level, you'll have a real edge over the field.`
  }

  // 3+ premium skills
  const names = premium.map(s => skillNames[s.key])
  return `${courseName} is a demanding, multi-dimensional track that tests ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}. Only the most well-rounded players survive four days here. One-trick ponies need not apply.`
}

// ── Players to Watch Selection ────────────────────────────────────

function pickUnique(candidates, existing, count = 1) {
  const usedIds = new Set(existing.map(p => p.id))
  return candidates.filter(p => !usedIds.has(p.id)).slice(0, count)
}

export function selectPlayersToWatch(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) return []

  const selected = []

  // 1. Top 2 by course fit
  const byFit = [...leaderboard]
    .filter(p => p.clutchMetrics?.courseFitScore != null)
    .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
  const topFit = pickUnique(byFit, selected, 2)
  topFit.forEach(p => selected.push({
    ...p,
    tag: 'Best Fit',
    tagColor: 'bg-gold/20 text-gold border-gold/30',
    narrative: buildFitNarrative(p),
  }))

  // 2. Top 1 by form
  const byForm = [...leaderboard]
    .filter(p => p.clutchMetrics?.formScore != null && p.clutchMetrics.formScore >= 65)
    .sort((a, b) => (b.clutchMetrics.formScore || 0) - (a.clutchMetrics.formScore || 0))
  const topForm = pickUnique(byForm, selected, 1)
  topForm.forEach(p => selected.push({
    ...p,
    tag: 'Hot Form',
    tagColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    narrative: buildFormNarrative(p),
  }))

  // 3. Top 1 by course history
  const byHistory = [...leaderboard]
    .filter(p => p.courseHistory?.rounds >= 8 && p.courseHistory?.avgToPar != null)
    .sort((a, b) => (a.courseHistory.avgToPar || 0) - (b.courseHistory.avgToPar || 0))
  const topHistory = pickUnique(byHistory, selected, 1)
  topHistory.forEach(p => selected.push({
    ...p,
    tag: 'Course History',
    tagColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    narrative: buildHistoryNarrative(p),
  }))

  // 4. Under the radar — high fit + OWGR 80+
  const underRadar = [...leaderboard]
    .filter(p =>
      p.clutchMetrics?.courseFitScore >= 65 &&
      p.owgrRank != null && p.owgrRank >= 80
    )
    .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
  const topRadar = pickUnique(underRadar, selected, 1)
  topRadar.forEach(p => selected.push({
    ...p,
    tag: 'Under the Radar',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    narrative: buildRadarNarrative(p),
  }))

  // If we still have < 5, fill with top OWGR players not yet selected
  if (selected.length < 5) {
    const byOwgr = [...leaderboard]
      .filter(p => p.owgrRank != null)
      .sort((a, b) => (a.owgrRank || 999) - (b.owgrRank || 999))
    const fillers = pickUnique(byOwgr, selected, 5 - selected.length)
    fillers.forEach(p => selected.push({
      ...p,
      tag: 'Top Ranked',
      tagColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      narrative: generatePlayerNarrative(p),
    }))
  }

  return selected.slice(0, 6)
}

function buildFitNarrative(p) {
  const fit = Math.round(p.clutchMetrics?.courseFitScore || 0)
  const name = p.name?.split(' ').pop() || p.name
  if (fit >= 85) return `${name}'s skill set is almost perfectly aligned with what this course demands. A fit score of ${fit} makes him one of the best statistical matches in the field.`
  if (fit >= 75) return `${name} profiles as a strong course fit with a score of ${fit}. His strengths line up well with the premium skills this track rewards.`
  return `${name} grades out as a solid fit (${fit}) for this layout, giving him an edge over players whose games don't match the course DNA.`
}

function buildFormNarrative(p) {
  const form = Math.round(p.clutchMetrics?.formScore || 0)
  const name = p.name?.split(' ').pop() || p.name
  if (form >= 85) return `${name} is playing some of the best golf of his career right now. A form score of ${form} puts him among the hottest players in the world entering this week.`
  if (form >= 75) return `${name} arrives in excellent form (${form}). Recent results suggest his game is trending in the right direction at exactly the right time.`
  return `${name}'s recent form (${form}) shows steady play heading into this week. Not the flashiest, but quietly building confidence.`
}

function buildHistoryNarrative(p) {
  const avg = p.courseHistory?.avgToPar
  const rounds = p.courseHistory?.rounds || 0
  const name = p.name?.split(' ').pop() || p.name
  const avgStr = avg != null ? (avg > 0 ? `+${avg.toFixed(1)}` : avg === 0 ? 'even par' : avg.toFixed(1)) : 'unknown'
  if (avg != null && avg <= -2) return `${name} has been dominant at this venue, averaging ${avgStr} over ${rounds} career rounds. This is one of his best courses on Tour.`
  if (avg != null && avg <= 0) return `${name} has a strong track record here, averaging ${avgStr} over ${rounds} rounds. He clearly knows how to navigate this layout.`
  return `${name} has ${rounds} rounds of experience at this venue (avg ${avgStr}). Course knowledge can be a real separator in tight finishes.`
}

function buildRadarNarrative(p) {
  const fit = Math.round(p.clutchMetrics?.courseFitScore || 0)
  const owgr = p.owgrRank
  const name = p.name?.split(' ').pop() || p.name
  return `${name} might not be on everyone's radar at world #${owgr}, but his course fit score of ${fit} suggests this layout plays to his strengths. A potential value play with upside.`
}

// ── Storylines ────────────────────────────────────────────────────

export function generateStorylines(leaderboard, course, weather, tournament) {
  const stories = []

  // 1. Field strength
  const fieldStory = buildFieldStrengthStory(leaderboard, tournament)
  if (fieldStory) stories.push(fieldStory)

  // 2. Form watch
  const formStory = buildFormStory(leaderboard)
  if (formStory) stories.push(formStory)

  // 3. Course history
  const historyStory = buildCourseHistoryStory(leaderboard, course)
  if (historyStory) stories.push(historyStory)

  // 4. Weather factor
  const weatherStory = buildWeatherStory(weather)
  if (weatherStory) stories.push(weatherStory)

  // 5. Sleeper pick
  const sleeperStory = buildSleeperStory(leaderboard)
  if (sleeperStory) stories.push(sleeperStory)

  return stories.slice(0, 5)
}

function buildFieldStrengthStory(leaderboard, tournament) {
  if (!leaderboard || leaderboard.length === 0) return null

  const top25 = leaderboard.filter(p => p.owgrRank != null && p.owgrRank <= 25).length
  const top50 = leaderboard.filter(p => p.owgrRank != null && p.owgrRank <= 50).length
  const fieldSize = leaderboard.length
  const isMajor = tournament?.isMajor
  const isSig = tournament?.isSignature

  let body
  if (top25 >= 20 || isMajor) {
    body = `This is an elite field${isMajor ? ' befitting a major championship' : ''}. With ${top25} of the world's top 25 and ${top50} of the top 50 in attendance, contenders will face premium competition all four rounds. No soft spots in this draw.`
  } else if (top25 >= 10 || isSig) {
    body = `A strong field${isSig ? ' for this signature event' : ''} with ${top25} top-25 players and ${top50} top-50 players among the ${fieldSize}-man field. Expect quality golf from start to finish.`
  } else if (top25 >= 5) {
    body = `A moderate field with ${top25} top-25 players and ${top50} of the top 50. There's talent at the top, but the middle and back of the pack present opportunities for value picks to climb the leaderboard.`
  } else {
    body = `A thinner field this week with just ${top25} top-25 player${top25 !== 1 ? 's' : ''} in attendance. That opens the door for lower-ranked players to put together a week and break through.`
  }

  return { icon: 'trophy', title: 'Field Strength', body }
}

function buildFormStory(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) return null

  const hotPlayers = leaderboard
    .filter(p => p.clutchMetrics?.formScore >= 80)
    .sort((a, b) => (b.clutchMetrics.formScore || 0) - (a.clutchMetrics.formScore || 0))
    .slice(0, 3)

  if (hotPlayers.length === 0) return null

  const names = hotPlayers.map(p => p.name?.split(' ').pop() || p.name)
  const body = hotPlayers.length >= 3
    ? `${names[0]}, ${names[1]}, and ${names[2]} all arrive with form scores above 80, meaning their recent results are well above their baseline. When multiple elite players are firing on all cylinders, it usually translates to a low winning score.`
    : hotPlayers.length === 2
    ? `Keep an eye on ${names[0]} and ${names[1]} — both are playing well above their baseline recently, with form scores exceeding 80. Momentum is real in golf, and these two have it.`
    : `${hotPlayers[0].name} stands out as the hottest player in the field with a form score of ${Math.round(hotPlayers[0].clutchMetrics.formScore)}. His recent results put him in a prime position to contend.`

  return { icon: 'fire', title: 'Form Watch', body }
}

function buildCourseHistoryStory(leaderboard, course) {
  if (!leaderboard || leaderboard.length === 0) return null

  const veterans = leaderboard
    .filter(p => p.courseHistory?.rounds >= 12 && p.courseHistory?.avgToPar != null)
    .sort((a, b) => (a.courseHistory.avgToPar || 0) - (b.courseHistory.avgToPar || 0))
    .slice(0, 3)

  if (veterans.length === 0) return null

  const courseName = course?.nickname || course?.name || 'this venue'
  const names = veterans.map(p => p.name?.split(' ').pop() || p.name)
  const best = veterans[0]
  const avgStr = best.courseHistory.avgToPar > 0 ? `+${best.courseHistory.avgToPar.toFixed(1)}` : best.courseHistory.avgToPar.toFixed(1)

  const body = veterans.length >= 2
    ? `${names[0]} leads the course history conversation at ${courseName} with an average of ${avgStr} over ${best.courseHistory.rounds} rounds, and ${names[1]} isn't far behind. In a game of inches, course knowledge like that can be the difference between contending and missing the cut.`
    : `${best.name} knows ${courseName} better than almost anyone, averaging ${avgStr} over ${best.courseHistory.rounds} career rounds here. That kind of institutional knowledge — knowing where to miss, where to be aggressive — is an underrated edge.`

  return { icon: 'history', title: 'Course History', body }
}

function buildWeatherStory(weather) {
  if (!weather || weather.length === 0) return null

  const avgWind = weather.reduce((sum, d) => sum + (d.windSpeed || 0), 0) / weather.length
  const maxWind = Math.max(...weather.map(d => d.windSpeed || 0))
  const avgDifficulty = weather.reduce((sum, d) => sum + (d.difficultyImpact || 0), 0) / weather.length

  if (avgWind < 10 && avgDifficulty < 0.2) {
    return { icon: 'sun', title: 'Weather Factor', body: 'Benign conditions are in the forecast this week. Low wind and comfortable temperatures should lead to a scoring fest. Expect birdies in bunches and a low winning score.' }
  }

  if (maxWind >= 25 || avgDifficulty >= 0.6) {
    const windyRounds = weather.filter(d => (d.windSpeed || 0) >= 20).length
    return { icon: 'wind', title: 'Weather Factor', body: `Wind will be the story this week, with gusts ${windyRounds > 1 ? `affecting ${windyRounds} of 4 rounds` : 'expected to pick up significantly'}. Players who can control trajectory and flight — especially iron players — will have a major advantage. Ball-strikers over birdie-makers in these conditions.` }
  }

  if (avgWind >= 12) {
    return { icon: 'wind', title: 'Weather Factor', body: 'A moderate breeze will add a layer of difficulty to the proceedings. It won\'t be brutal, but it\'s enough to separate the field. Players comfortable playing in the wind — links-style golfers, international players — could have an edge.' }
  }

  return { icon: 'cloud', title: 'Weather Factor', body: 'Mixed conditions are expected this week, with varying wind and temperatures across the four rounds. Flexibility and the ability to adjust gameplan round-to-round will be key.' }
}

function buildSleeperStory(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) return null

  const sleepers = leaderboard
    .filter(p =>
      p.clutchMetrics?.courseFitScore >= 70 &&
      p.owgrRank != null && p.owgrRank >= 60 && p.owgrRank <= 200
    )
    .sort((a, b) => (b.clutchMetrics.courseFitScore || 0) - (a.clutchMetrics.courseFitScore || 0))
    .slice(0, 2)

  if (sleepers.length === 0) return null

  const names = sleepers.map(p => p.name)
  const body = sleepers.length >= 2
    ? `${names[0]} (world #${sleepers[0].owgrRank}) and ${names[1]} (world #${sleepers[1].owgrRank}) both grade out as strong course fits despite flying under the mainstream radar. Their skill profiles match what this course demands — don't be surprised to see them on the weekend leaderboard.`
    : `${names[0]} at world #${sleepers[0].owgrRank} is the kind of under-the-radar pick that makes you look smart on Monday. His course fit score of ${Math.round(sleepers[0].clutchMetrics.courseFitScore)} suggests this layout plays right into his hands.`

  return { icon: 'eye', title: 'Sleeper Pick', body }
}

// ── Fallback per-player narrative ─────────────────────────────────

export function generatePlayerNarrative(player) {
  if (!player) return ''

  const name = player.name?.split(' ').pop() || player.name || 'This player'
  const owgr = player.owgrRank

  const fit = player.clutchMetrics?.courseFitScore
  const form = player.clutchMetrics?.formScore

  if (fit != null && fit >= 75 && form != null && form >= 75) {
    return `${name} brings both elite course fit (${Math.round(fit)}) and strong recent form (${Math.round(form)}) into this week — a potent combination.`
  }

  if (fit != null && fit >= 75) {
    return `${name}'s skill set maps well to this course (fit: ${Math.round(fit)}). That statistical advantage could pay off in a deep tournament run.`
  }

  if (form != null && form >= 75) {
    return `${name} arrives in strong form (${Math.round(form)}), riding a wave of confident recent play into this week's event.`
  }

  if (owgr != null && owgr <= 15) {
    return `${name} is one of the premier players in the world at #${owgr}. Talent alone makes him a threat to contend any given week.`
  }

  if (owgr != null && owgr <= 50) {
    return `Ranked #${owgr} in the world, ${name} has the pedigree and ability to compete at the highest level this week.`
  }

  return `${name} will look to make an impact this week and climb the world rankings.`
}
