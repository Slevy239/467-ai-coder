const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const adminClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDatabase() {
  try {
    await adminClient.connect();

    // Check if the target database exists
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]
    );

    if (dbCheck.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database '${process.env.DB_NAME}' created.`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }

    await adminClient.end();

    // Connect to the target database with SSL
    const projectClient = new Client({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await projectClient.connect();

    // Create users table if it doesn't exist
    await projectClient.query(`
      CREATE TABLE IF NOT EXISTS usersv (
        id SERIAL PRIMARY KEY,
        username VARCHAR(45) UNIQUE NOT NULL,
        password VARCHAR(45) NOT NULL,
        role TEXT DEFAULT 'user'
      );
    `);
    console.log("Table 'usersv' checked/created.");

    await projectClient.query(`
      CREATE TABLE IF NOT EXISTS todosv (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES usersv(id)
      );
    `);
    console.log("Table 'todosv' checked/created.");

    // Insert test users if they don’t exist
    const adminExists = await projectClient.query(`SELECT * FROM usersv WHERE username = 'admin'`);
    const userExists = await projectClient.query(`SELECT * FROM usersv WHERE username = 'user1'`);

    if (adminExists.rowCount === 0) {
      await projectClient.query(
        'INSERT INTO usersv (username, password, role) VALUES ($1, $2, $3)',
        ['admin', 'admin123', 'admin']
      );
      console.log('Admin user created');
    }

    if (userExists.rowCount === 0) {
      await projectClient.query(
        'INSERT INTO usersv (username, password, role) VALUES ($1, $2, $3)',
        ['user1', 'user123', 'user']
      );
      console.log('Regular user created');
    }

    // Show all tables
    const tableList = await projectClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);

    console.log('✅ Tables in the database:');
    tableList.rows.forEach(row => console.log(`- ${row.table_name}`));

    await projectClient.end();

  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

module.exports = initDatabase;
