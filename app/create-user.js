/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require('bcryptjs');
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

(async () => {
  const conn = process.env.DATABASE_URL;
  const email = process.env.OWNER_EMAIL || 'owner@tailorshop.com';
  const password = process.env.OWNER_PASSWORD || 'TailorShop2026!';
  if (!conn) {
    throw new Error("Set DATABASE_URL before running this script.");
  }
  const sql = postgres(conn, { ssl: 'require', max: 1 });
  try {
    const hash = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (role_id, branch_id, name, email, password_hash, is_tailor_staff, status)
      SELECT r.id, b.id, 'Owner Admin', ${email}, ${hash}, false, 'active'
      FROM roles r
      JOIN branches b ON b.is_main = true
      WHERE r.name = 'owner'
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          status = 'active',
          role_id = EXCLUDED.role_id,
          branch_id = EXCLUDED.branch_id
    `;
    console.log('created owner user');
  } finally {
    await sql.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
