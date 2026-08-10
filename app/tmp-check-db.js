const fs = require('fs');
const { Client } = require('pg');
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.split(/\r?\n/).find((line) => line.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').replace(/^"|"$/g, '');
const client = new Client({ connectionString: dbUrl });

(async () => {
  try {
    await client.connect();
    console.log('connected');
    const res = await client.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
    console.log(res.rows.map((row) => row.table_name).join('\n'));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
