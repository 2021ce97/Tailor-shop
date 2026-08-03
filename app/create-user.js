const bcrypt = require('bcryptjs');
const postgres = require('postgres');

(async () => {
  const conn = 'postgresql://postgres.soyevjmcufmqsqpirphd:Tailorrayan12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
  const sql = postgres(conn, { ssl: 'require', max: 1 });
  try {
    const hash = await bcrypt.hash('Admin@123', 10);
    await sql`
      INSERT INTO users (role_id, branch_id, name, email, password_hash, is_tailor_staff, status)
      SELECT r.id, b.id, 'Owner Admin', 'owner@tailorshop.com', ${hash}, false, 'active'
      FROM roles r
      JOIN branches b ON b.is_main = true
      WHERE r.name = 'owner'
      ON CONFLICT (email) DO NOTHING
    `;
    console.log('created owner user');
  } finally {
    await sql.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
