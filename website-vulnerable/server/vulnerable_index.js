// vulnerable_index.js
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const serialize = require('serialize-javascript');
const xml2js = require('xml2js');
const initDatabase = require('./initDB');

const PORT = process.env.PORT || 5000;

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = 'insecure_secret';

// Initialize DB (create tables etc.)
initDatabase();

// DB connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// 🔓 Insecure login — vulnerable to SQLi
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM usersv WHERE username = '${username}' AND password = '${password}'`;

  try {
    const result = await pool.query(sql);

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

// 🔓 Insecure registration — no sanitization
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const sql = `INSERT INTO usersv (username, password, role) VALUES ('${username}', '${password}', 'user') RETURNING id`;
  try {
    const result = await pool.query(sql);
    res.status(201).json({ message: 'User registered', userId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 🔓 Broken Access Control — no user validation
app.get('/todos/:userId', async (req, res) => {
  const sql = `SELECT * FROM todosv WHERE user_id = ${req.params.userId}`;
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/todos', async (req, res) => {
  const { user_id, content } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO todosv (user_id, content) VALUES ($1, $2) RETURNING *',
      [user_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to create todo:', err.message);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM todosv WHERE id = $1', [req.params.id]);
    res.send('Todo deleted');
  } catch (err) {
    console.error('Failed to delete todo:', err.message);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.delete('/todos/:userId/:todoId', async (req, res) => {
  const sql = `DELETE FROM todosv WHERE id = ${req.params.todoId}`;
  try {
    await pool.query(sql);
    res.sendStatus(204);
  } catch {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// 🔓 Admin route exposed to everyone
// 🚨 Any user can fetch ALL users
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM usersv');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 🚨 Any user can delete ANY other user
app.delete('/delete-user/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM usersv WHERE id = $1', [req.params.id]);
    res.send('User deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 🔓 Insecure Deserialization
const nserialize = require('node-serialize'); // 🚨 Insecure
app.post('/deserialize', (req, res) => {
  try {
    const { data } = req.body;

    // 🚨 INSECURE: Deserializing user-controlled input
    const obj = nserialize.unserialize(data);

    if (typeof obj.exploit === 'function') {
      obj.exploit(); // 💥 Executes the malicious payload
    }

    res.send(`Deserialized object: ${JSON.stringify(obj)}`);
  } catch (err) {
    console.error('Deserialization error:', err.message);
    res.status(500).send('Deserialization failed.');
  }
});

// 🔓 Known vulnerable components
app.get('/serialize-demo', (req, res) => {
  // 🚨 Vulnerable: Serializing a function into client-side script
  const xssFunction = () => {
    alert('🚨 XSS via serialize-javascript function');
  };

  // Serialize function unsafely (isJSON: false allows function serialization)
  const script = `<script>(${serialize(xssFunction, { isJSON: false })})();</script>`;

  const html = `
    <html>
      <head><title>serialize-javascript XSS Demo</title></head>
      <body>
        <h1>Vulnerable Function Injection Demo</h1>
        ${script}
        <p>If this were vulnerable, an alert would appear in the browser.</p>
      </body>
    </html>
  `;

  console.log('[DEBUG] serialize version:', require('serialize-javascript/package.json').version);
  console.log('[DEBUG] Rendered HTML:\n', html);

  res.send(html);
});

// 🔓 XXE endpoint
app.post('/upload-xml', (req, res) => {
  const xml = req.body.xml;
  const parser = new xml2js.Parser({
    explicitArray: false,
    xmlns: true
  });

  parser.parseString(xml, (err, result) => {
    if (err) return res.status(500).send('XML Parse Error');
    res.send('XML processed.');
  });
});

// 🔓 Simulated SQLi
app.post('/search', async (req, res) => {
  const term = req.body.term;
  const sql = `SELECT * FROM todosv WHERE content ILIKE '%${term}%'`;
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚨 Vulnerable server running on http://localhost:${PORT}`);
});