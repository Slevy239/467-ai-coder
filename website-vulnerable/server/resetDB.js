const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
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
