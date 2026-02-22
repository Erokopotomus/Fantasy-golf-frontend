// Blocks dangerous Prisma commands when DATABASE_URL points at production (Railway)
require('dotenv').config();
const url = process.env.DATABASE_URL || '';
if (/rlwy\.net|railway/i.test(url)) {
  console.error('\n🚫 BLOCKED: DATABASE_URL points at production (Railway).');
  console.error('   Use "npm run db:migrate:prod" for safe production migrations.');
  console.error('   Or point DATABASE_URL at a local database.\n');
  process.exit(1);
}
