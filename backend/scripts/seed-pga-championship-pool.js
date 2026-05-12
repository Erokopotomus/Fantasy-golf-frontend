/**
 * One-shot seeder: creates the PGA Championship pool for Eric mirroring the
 * easyofficepools.com 6-tier structure. Tied to Eric's userId so it shows
 * up under "Pools you commish" on the landing page.
 */
const prisma = require('../src/lib/prisma')
const { generateUniqueSlug, generateAdminToken } = require('../src/services/poolService')

const COMMISSIONER_USER_ID = 'cml8xo2960000ny2th1t4z5sd' // Eric
const COMMISSIONER_EMAIL = 'ericmsaylor@gmail.com'

const TIERS = [
  {
    tierNumber: 1, picksRequired: 1, label: null,
    players: [
      'Scottie Scheffler', 'Rory McIlroy', 'Jon Rahm', 'Cameron Young',
      'Bryson DeChambeau', 'Xander Schauffele', 'Matt Fitzpatrick',
      'Ludvig Aberg', 'Tommy Fleetwood', 'Collin Morikawa',
    ],
  },
  {
    tierNumber: 2, picksRequired: 1, label: null,
    players: [
      'Brooks Koepka', 'Justin Rose', 'Russell Henley', 'Si Woo Kim',
      'Justin Thomas', 'Robert MacIntyre', 'Viktor Hovland',
      'Patrick Cantlay', 'Tyrrell Hatton', 'Jordan Spieth',
    ],
  },
  {
    tierNumber: 3, picksRequired: 1, label: null,
    players: [
      'Sam Burns', 'Hideki Matsuyama', 'Adam Scott', 'Rickie Fowler',
      'Chris Gotterup', 'Patrick Reed', 'Min Woo Lee', 'Ben Griffin',
      'Sepp Straka', 'Shane Lowry',
    ],
  },
  {
    tierNumber: 4, picksRequired: 1, label: null,
    players: [
      'Akshay Bhatia', 'Maverick McNealy', 'Joaquin Niemann', 'Jason Day',
      'J.J. Spaun', 'Kurt Kitayama', 'Harris English', 'Nicolai Hojgaard',
      'Gary Woodland', 'David Puig',
    ],
  },
  {
    tierNumber: 5, picksRequired: 1, label: null,
    players: [
      'Jacob Bridgeman', 'Michael Thorbjornsen', 'Keegan Bradley',
      'Corey Conners', 'Kristoffer Reitan', 'Alex Fitzpatrick',
      'Sudarshan Yellamaraju', 'Harry Hall', 'Sungjae Im', 'Alexander Noren',
    ],
  },
  {
    tierNumber: 6, picksRequired: 1, label: null,
    players: [
      'Sahith Theegala', 'Thomas Detry', 'Marco Penge', 'Sam Stevens',
      'Wyndham Clark', 'Alex Smalley', 'Keith Mitchell', 'Daniel Berger',
      'Ryan Gerard', 'Nick Taylor', 'Rasmus Hojgaard', 'Dustin Johnson',
      'Pierceson Coody', 'Aaron Rai', 'Jordan L. Smith', 'Angel Ayora Fanegas',
      'Bud Cauley', 'Brandt Snedeker', 'Matthew McCarty', 'Jayden Trey Schaper',
      'Brian Harman', 'Ryan Fox', 'J.T. Poston', 'Taylor Pendrith',
      'Michael Kim', 'Ryo Hisatsune', 'Denny McCarthy', 'Max Homa',
      'Cameron Smith', 'Tom McKibbin', 'Rico Hoey', 'Matt Wallace',
      'Hao-Tong Li', 'Ricky Castillo', 'Michael Brennan', 'Max Greyserman',
      'Christiaan Bezuidenhout', 'Stephan Jaeger', 'Rasmus Neergaard-Petersen',
      'Aldrich Potgieter', 'Andrew Novak', 'Patrick Rodgers', 'Daniel Hillier',
      'Max McGreevy', 'Chris Kirk', 'Billy Horschel', 'Casey Jarvis',
      'Ian Holt', 'John Parry', 'William Mouw', 'Steven Fisk',
      'Nicolas Echavarria', 'Garrick Higgo', 'John Keefer', 'Austin Smotherman',
      'Matthias Schmid', 'Sami Valimaki', 'Andrew Putnam', 'Lucas Glover',
      'Daniel Brown', 'Tom Hoge', 'Jhonattan Vegas', 'Emiliano Grillo',
      'Mikael Lindberg', 'Adrien Saddier', 'Bernd Wiesberger', 'Elvis Smylie',
      'Kota Kaneko', 'Stewart Cink', 'David Lipsky', 'Andy Sullivan',
      'Chandler Blanchet', 'Joe Highsmith', 'Travis Smyth', 'Adam Schenk',
      'Davis Riley', 'Brian Campbell', 'Martin Kaymer', 'Kazuki Higa',
      'Jordan Gumberg', 'Padraig Harrington', 'Austin Hurt', 'Ben Kern',
      'Ben Polland', 'Braden Shattuck', 'Bryce Fisher', 'Chris Gabriele',
      'Derek Berg', 'Francisco Bide', 'Garrett Sapp', 'Jared Jones',
      'Jason Dufner', 'Jesse Droemer', 'Jimmy Walker', 'Luke Donald',
      'Mark Geddes', 'Michael Block', 'Michael Kartrude', 'Paul McClure',
      'Ryan Lenahan', 'Ryan Vermeer', 'Shaun Micheel', 'Timothy Wiseman',
      'Tyler Collet', 'Y.E. Yang', 'Zach Haynes',
    ],
  },
]

function norm(name) {
  return name.toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function findPlayerId(name, allPlayers) {
  const target = norm(name)
  // Exact normalized match
  let hit = allPlayers.find(p => norm(p.name) === target)
  if (hit) return { id: hit.id, matched: 'exact' }
  // Last+first reversed (e.g., "DeChambeau, Bryson")
  hit = allPlayers.find(p => {
    const parts = p.name.split(/\s+/)
    if (parts.length < 2) return false
    const reversed = `${parts.slice(1).join(' ')} ${parts[0]}`
    return norm(reversed) === target
  })
  if (hit) return { id: hit.id, matched: 'reversed' }
  // Last-name-only fallback if first initial matches
  const targetParts = target.split(' ')
  const targetLast = targetParts[targetParts.length - 1]
  const targetFirstInitial = targetParts[0]?.[0]
  const lastMatches = allPlayers.filter(p => {
    const np = norm(p.name).split(' ')
    return np[np.length - 1] === targetLast && np[0]?.[0] === targetFirstInitial
  })
  if (lastMatches.length === 1) return { id: lastMatches[0].id, matched: 'fuzzy', actualName: lastMatches[0].name }
  return null
}

async function main() {
  // Find the live PGA Championship tournament
  const tournament = await prisma.tournament.findFirst({
    where: { name: { contains: 'PGA Championship' }, startDate: { gte: new Date('2026-05-01') } },
    select: { id: true, name: true, startDate: true },
  })
  if (!tournament) {
    console.error('ERR: PGA Championship 2026 not found in DB')
    process.exit(1)
  }
  console.log(`Tournament: ${tournament.name} (${tournament.id})`)

  // Load all players for matching. Restrict to those in the tournament field
  // first; fall back to the global player pool for amateurs / club pros that
  // might not be in DG's field response yet.
  const fieldPlayers = await prisma.player.findMany({
    where: { performances: { some: { tournamentId: tournament.id } } },
    select: { id: true, name: true },
  })
  console.log(`Tournament field size: ${fieldPlayers.length}`)
  const allPlayers = await prisma.player.findMany({ select: { id: true, name: true } })
  console.log(`Global player pool: ${allPlayers.length}`)

  // Match each tier's player list
  const resolvedTiers = []
  const unmatched = []
  for (const tier of TIERS) {
    const tierPlayerIds = []
    for (const playerName of tier.players) {
      // Prefer the field match, then global pool
      const hit = (await findPlayerId(playerName, fieldPlayers)) || (await findPlayerId(playerName, allPlayers))
      if (hit) {
        tierPlayerIds.push({ playerId: hit.id, name: playerName, matchKind: hit.matched, actualName: hit.actualName || playerName })
      } else {
        unmatched.push({ tier: tier.tierNumber, name: playerName })
      }
    }
    resolvedTiers.push({ ...tier, resolved: tierPlayerIds })
  }

  console.log('\n=== Match summary ===')
  for (const t of resolvedTiers) {
    console.log(`Tier ${t.tierNumber}: ${t.resolved.length}/${t.players.length} matched`)
    const fuzzy = t.resolved.filter(p => p.matchKind === 'fuzzy')
    if (fuzzy.length) {
      console.log('  Fuzzy matches (verify):')
      for (const f of fuzzy) console.log(`    "${f.name}" → "${f.actualName}"`)
    }
  }
  if (unmatched.length) {
    console.log(`\nUnmatched (${unmatched.length}) — will be skipped:`)
    for (const u of unmatched) console.log(`  Tier ${u.tier}: ${u.name}`)
  }

  // Sanity: every tier still has at least picksRequired players
  for (const t of resolvedTiers) {
    if (t.resolved.length < t.picksRequired) {
      console.error(`ERR: Tier ${t.tierNumber} has ${t.resolved.length} players, need ${t.picksRequired}`)
      process.exit(1)
    }
  }

  // Create the pool
  const slug = await generateUniqueSlug()
  const adminToken = generateAdminToken()
  const pool = await prisma.pool.create({
    data: {
      slug, adminToken,
      name: 'Buckeye PGA Championship',
      tournamentId: tournament.id,
      commissionerEmail: COMMISSIONER_EMAIL,
      commissionerUserId: COMMISSIONER_USER_ID,
      scoringPreset: 'standard',
      status: 'DRAFT',
      tiers: {
        create: resolvedTiers.map(t => ({
          tierNumber: t.tierNumber,
          label: t.label,
          picksRequired: t.picksRequired,
          players: { create: t.resolved.map(p => ({ playerId: p.playerId })) },
        })),
      },
    },
  })

  const baseUrl = 'https://clutchfantasysports.com'
  console.log('\n=== Pool created ===')
  console.log(`Name: ${pool.name}`)
  console.log(`Slug: ${pool.slug}`)
  console.log(`Status: ${pool.status} (you need to publish it via the admin link)`)
  console.log(`Share link: ${baseUrl}/pools/${pool.slug}`)
  console.log(`Admin link: ${baseUrl}/pools/${pool.slug}/admin?token=${pool.adminToken}`)
  console.log(`Or just visit ${baseUrl}/pools — should show under "Pools you commish" since it's tied to your account.`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
