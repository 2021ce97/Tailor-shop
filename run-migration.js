const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, 'app', 'node_modules', 'pg'));

const envPath = path.join(__dirname, 'app', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

async function runMigration() {
  const migrationPaths = process.env.MIGRATION_ONLY ? [
    path.join(__dirname, 'db', 'migrations', process.env.MIGRATION_ONLY),
  ] : [
    path.join(__dirname, 'db', 'migrations', '009_simplify_to_tailoring_only.sql'),
    path.join(__dirname, 'db', 'migrations', '010_restore_single_user_auth.sql'),
    path.join(__dirname, 'db', 'migrations', '011_measurement_templates.sql'),
  ];
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is not set. Add it to app/.env.local.');
  
  console.log('Connecting to database...');
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected successfully!');
    
    for (const migrationPath of migrationPaths) {
      console.log(`\nExecuting ${path.basename(migrationPath)}...`);
      await client.query(fs.readFileSync(migrationPath, 'utf8'));
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
