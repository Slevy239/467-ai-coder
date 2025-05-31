// UCV_index.js
// Backend vulnerable to CVE-2020-7660 via use of serialize-javascript <= 2.1.1

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const initDatabase = require('./initDB');
const bodyParser = require('body-parser');
const serialize = require('serialize-javascript'); // vulnerable version
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Init DB (create database + users table if needed)
initDatabase();

// DB pool
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
  });

// ROUTES

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, password]);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length > 0) {
      res.status(200).json({ userId: result.rows[0].id });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
});

// Get Todos (vulnerable route)
app.get('/todos/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const result = await pool.query('SELECT * FROM todos WHERE user_id = $1', [userId]);

    // VULNERABILITY: serialize-javascript without escaping, rendered in HTML
    const script = `<script>var todos = ${serialize(result.rows)};</script>`;
    const html = `
      <html>
        <head><title>Todos</title></head>
        <body>
          <h1>User Todos</h1>
          ${script}
          <pre>${JSON.stringify(result.rows, null, 2)}</pre>
        </body>
      </html>
    `;

    res.send(html); // unsafe HTML response
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// Create Todo
app.post('/todos', async (req, res) => {
  const { user_id, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO todos (user_id, content) VALUES ($1, $2) RETURNING *',
      [user_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update Todo
app.put('/todos/:id', async (req, res) => {
  const { content } = req.body;
  const id = req.params.id;
  try {
    const result = await pool.query(
      'UPDATE todos SET content = $1 WHERE id = $2 RETURNING *',
      [content, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// Delete Todo
app.delete('/todos/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Admin: List Users
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin: Delete User
app.delete('/delete-user/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[UCV] Server running on http://localhost:${PORT}`);
  console.log(`[UCV] Try this payload to test:`);
  console.log(`[UCV] http://localhost:${PORT}/api/todo?userId=1`);
  console.log(`[UCV] Injected malicious todo content like "</script><script>alert('XSS')</script>" will execute`);
});
