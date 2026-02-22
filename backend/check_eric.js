const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:sGxxdJfAbPZFdnSgKpLmyuApUukFJOng@switchback.proxy.rlwy.net:18528/railway' } } });

async function main() {
  const lid = 'cmlkzxdcr00itsz2t7ys484og'; // Bro Montana Bowl

  const rows = await p.$queryRawUnsafe(`SELECT "seasonYear", "ownerName", "teamName", wins, losses, ties, "pointsFor", "pointsAgainst" FROM historical_seasons WHERE "leagueId" = '${lid}' ORDER BY "ownerName", "seasonYear"`);

  const byOwner = {};
  for (const row of rows) {
    const name = row.ownerName;
    if (!byOwner[name]) byOwner[name] = [];
    byOwner[name].push(row);
  }

  // Show Eric and Yeuh Girl related
  for (const [name, seasons] of Object.entries(byOwner)) {
    if (name.toLowerCase().includes('eric') || name.toLowerCase().includes('yeuh') || name.toLowerCase().includes('girl')) {
      console.log('\n' + name + ' (' + seasons.length + ' seasons):');
      let totalW = 0, totalL = 0, totalT = 0, totalPF = 0, totalPA = 0;
      for (const s of seasons) {
        console.log(`  ${s.seasonYear}: ${s.wins}-${s.losses}-${s.ties || 0} PF:${s.pointsFor} PA:${s.pointsAgainst} (${s.teamName})`);
        totalW += s.wins;
        totalL += s.losses;
        totalT += (s.ties || 0);
        totalPF += Number(s.pointsFor);
        totalPA += Number(s.pointsAgainst);
      }
      console.log(`  TOTAL: ${totalW}-${totalL}-${totalT} PF:${totalPF.toFixed(1)} PA:${totalPA.toFixed(1)}`);
    }
  }

  console.log('\n--- All owners season count ---');
  for (const [name, seasons] of Object.entries(byOwner)) {
    console.log(`${name}: ${seasons.length} seasons`);
  }

  // Also check aliases
  const aliases = await p.$queryRawUnsafe(`SELECT * FROM owner_aliases WHERE "leagueId" = '${lid}'`);
  console.log('\n--- Aliases ---');
  for (const a of aliases) {
    console.log(`"${a.ownerName}" -> "${a.canonicalName}" (active: ${a.isActive})`);
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
