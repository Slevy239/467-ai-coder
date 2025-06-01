const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required by Render's PostgreSQL
  }
});

async function resetDatabase() {
  try {
    await client.connect();

    console.log('⚠️ Dropping tables...');
    await client.query('DROP TABLE IF EXISTS todos');
    await client.query('DROP TABLE IF EXISTS users');
    await client.query('DROP TABLE IF EXISTS todosv');
    await client.query('DROP TABLE IF EXISTS usersv');

    console.log('✅ Tables dropped.');
    await client.end();
  } catch (err) {
    console.error('❌ Error resetting database:', err.message);
    process.exit(1);
  }
}

resetDatabase();
