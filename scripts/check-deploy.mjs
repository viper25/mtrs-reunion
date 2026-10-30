import { readFileSync } from 'node:fs';

const config = readFileSync('wrangler.toml', 'utf8');
const value = key => config.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'))?.[1]?.trim();
const missing = [];
if (!value('database_id') || /^0+(?:-0+)*$/.test(value('database_id'))) missing.push('a real D1 database_id');
for (const key of ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ADMIN_EMAILS']) if (!value(key)) missing.push(key);
if (!value('CONTACT_EMAIL') && !value('CONTACT_WHATSAPP')) missing.push('CONTACT_EMAIL or CONTACT_WHATSAPP for lost-link recovery');
if (missing.length) {
  console.error(`Before deployment, configure ${missing.join(', ')} in wrangler.toml. See README.md for Cloudflare Access and database setup.`);
  process.exit(1);
}
