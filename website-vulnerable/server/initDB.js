const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

async function initDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usersv (
        id SERIAL PRIMARY KEY,
        username VARCHAR(45) UNIQUE NOT NULL,
        password VARCHAR(45) NOT NULL,
        role TEXT DEFAULT 'user'
      );
    `);
    console.log("Table 'usersv' checked/created.");

    // Create todos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS todosv (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES usersv(id)
      );
    `);
    console.log("Table 'todosv' checked/created.");

    // Insert test admin and user
    const adminExists = await client.query(`SELECT * FROM usersv WHERE username = 'admin'`);
    if (adminExists.rowCount === 0) {
      await client.query(
        `INSERT INTO usersv (username, password, role) VALUES ('admin', 'admin123', 'admin')`
      );
      console.log("Admin user created.");
    }

    const userExists = await client.query(`SELECT * FROM usersv WHERE username = 'user1'`);
    if (userExists.rowCount === 0) {
      await client.query(
        `INSERT INTO usersv (username, password, role) VALUES ('user1', 'user123', 'user')`
      );
      console.log("Regular user created.");
    }

    // List tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    console.log("✅ Tables in the database:");
    tables.rows.forEach(row => console.log(`- ${row.table_name}`));

    await client.end();
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

module.exports = initDatabase;
