const express = require('express');
const cors = require('cors');
const initDatabase = require('./initDB');
const { Pool } = require('pg');
require('dotenv').config();
const logEvent = require('./logger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

initDatabase();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

// ========== Register ==========
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, password, role || 'user']
    );
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// ========== Login ==========
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 1) {
      const user = result.rows[0];
      res.status(200).json({
        success: true,
        id: user.id,
        username: user.username,
        role: user.role
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false });
  }
});

// ====== Broken Access Control Routes ======

// 🚨 Any user can view all todos
app.get('/todos/:userId', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM todos WHERE user_id = $1',
        [req.params.userId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch todos' });
    }
  });

// 🚨 Any user can create a todo for ANY user ID
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

// 🚨 Any user can delete ANY todo (no ownership check)
app.delete('/todos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
    res.send('Todo deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// 🚨 Any user can fetch ALL users
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 🚨 Any user can delete ANY other user
app.delete('/delete-user/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.send('User deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========== Server Startup ==========
app.listen(PORT, () => {
  console.log(`BAC server listening on port ${PORT}`);
});
