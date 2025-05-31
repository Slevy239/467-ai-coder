const { Client } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

// Determine connection options
function getClientConfig(dbName = 'postgres') {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  } else {
    return {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: dbName,
    };
  }
}

async function initDatabase() {
  const adminClient = new Client(getClientConfig('postgres'));
  
  try {
    await adminClient.connect();

    if (!process.env.DATABASE_URL) {
      // Check/create DB only in local dev
      const dbCheck = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME]
      );

      if (dbCheck.rowCount === 0) {
        await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        console.log(`Database '${process.env.DB_NAME}' created.`);
      } else {
        console.log(`Database '${process.env.DB_NAME}' already exists.`);
      }
    }

    await adminClient.end();

    const projectClient = new Client(getClientConfig(process.env.DB_NAME));
    await projectClient.connect();

    await projectClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(45) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role TEXT DEFAULT 'user'
      );
    `);
    console.log("Table 'users' checked/created.");

    await projectClient.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    console.log("Table 'todos' checked/created.");

    const adminExists = await projectClient.query(`SELECT * FROM users WHERE username = 'admin'`);
    const userExists = await projectClient.query(`SELECT * FROM users WHERE username = 'user1'`);

    if (adminExists.rowCount === 0) {
      const hashedAdmin = 'admin123';
      await projectClient.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['admin', hashedAdmin, 'admin']
      );
      console.log('Admin user created');
    }

    if (userExists.rowCount === 0) {
      const hashedUser = 'user123';
      await projectClient.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        ['user1', hashedUser, 'user']
      );
      console.log('Regular user created');
    }

    await projectClient.end();

  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

module.exports = initDatabase;
