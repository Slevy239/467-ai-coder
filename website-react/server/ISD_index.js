const express = require('express');
const cors = require('cors');
const initDatabase = require('./initDB');
const { Pool } = require('pg');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const logEvent = require('./logger');
const serialize = require('node-serialize');  // 🚨 Insecure

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests


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

// Global request logger
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const ua = req.headers['user-agent'];
  logEvent(`Incoming ${req.method} to ${req.url} from ${ip} | UA: ${ua}`);
  next();
});

// ======= AUTH MIDDLEWARE (Simulated via headers) =======
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden: Admins only' });
}


// Routes
// ======================= REGISTER =======================
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const role = 'user';

  try {
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, password, role]
    );
    logEvent(`User registered: ${username}`);
    res.status(201).json({ success: true });
  } catch (error) {
    logEvent(`Registration error for ${username}: ${error.message}`);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ======================= LOGIN =======================
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 1) {
      const user = result.rows[0];
      const token = generateToken(user);
      logEvent(`Login SUCCESS: ${username}`);
      res.status(200).json({ token });
    } else {
      logEvent(`Login FAILURE: ${username}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    logEvent(`Login ERROR for ${username}: ${err.message}`);
    res.status(500).json({ success: false });
  }
});

// ======================= TODOS =======================
// Get todos for a user by user ID
app.get('/todos/:userId', authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Not your todos' });
  }

  try {
    const result = await pool.query('SELECT * FROM todos WHERE user_id = $1', [userId]);
    logEvent(`Fetched TODOs for user ${userId}`);
    res.json(result.rows);
  } catch (err) {
    logEvent(`Fetch TODOs ERROR for user ${userId}: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch todos' });
  }
});



/////////////////////ADDING SECTION THAT WOULD ALLOW SQL INJECTION ATTACK THEN COMMENTING OUT///////////////////////
// Add new todo
// app.post('/todos', async (req, res) => {
//   const { user_id, content } = req.body;
//   try {
//     // Directly interpolate user input into the query string (vulnerable to SQL injection)
//     const query = `INSERT INTO todos (user_id, content) VALUES (${user_id}, '${content}')`;
//     await pool.query(query);

//     logEvent(`User ${user_id} added a TODO: "${content}"`);
//     res.status(201).json({ message: 'Todo added' });
//   } catch (err) {
//     console.error('Error adding todo:', err.message);
//     res.status(500).json({ message: 'Failed to add todo' });
//   }
// });
////////////////////////////////////////////////////////////////////////////////////


// Add new todo
app.post('/todos', authenticateJWT, async (req, res) => {
  const { content } = req.body;
  const user_id = req.user.id;

  try {
    await pool.query(
      'INSERT INTO todos (user_id, content) VALUES ($1, $2)',
      [user_id, content]
    );
    logEvent(`User ${user_id} added a TODO: "${content}"`);
    res.status(201).json({ message: 'Todo added' });
  } catch (err) {
    logEvent(`TODO CREATE ERROR by ${user_id}: ${err.message}`);
    res.status(500).json({ message: 'Failed to add todo' });
  }
});


// Update todo
app.put('/todos/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  try {
    const result = await pool.query('SELECT user_id FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Not your todo' });
    }

    await pool.query('UPDATE todos SET content = $1 WHERE id = $2', [content, id]);
    logEvent(`Todo ID ${id} updated to: "${content}"`);
    res.json({ message: 'Todo updated' });
  } catch (err) {
    logEvent(`TODO UPDATE ERROR id ${id}: ${err.message}`);
    res.status(500).json({ message: 'Failed to update todo' });
  }
});

// Delete todo
app.delete('/todos/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT user_id FROM todos WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Todo not found' });

    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Not your todo' });
    }

    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    logEvent(`TODO DELETED id ${id}`);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    logEvent(`TODO DELETE ERROR id ${id}: ${err.message}`);
    res.status(500).json({ message: 'Failed to delete todo' });
  }
});


// ========== AdminDashboard-safe endpoints ==========
app.get('/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users');
    logEvent(`Admin fetched user list`);
    res.json(result.rows);
  } catch (err) {
    logEvent(`Admin fetch users ERROR: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/delete-user/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    logEvent(`Admin deleted user id ${req.params.id}`);
    res.send('User deleted');
  } catch (err) {
    logEvent(`Admin delete user ERROR id ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

const serializejs = require('serialize-javascript');

app.get('/serialize-demo', (req, res) => {
  const xssFunction = () => {
    alert('🚨 This should not run');
  };

  // serialize-javascript@2.1.1 will escape this properly
  const script = `<script>(${serializejs(xssFunction, { isJSON: false })})();</script>`;

  const html = `
    <html>
      <head><title>Safe Serialize Demo</title></head>
      <body>
        <h2>Serialized output (secure)</h2>
        ${script}
        <p>This function should appear as a string and not execute.</p>
      </body>
    </html>
  `;

  console.log('[SECURE] serialize-javascript version:', require('serialize-javascript/package.json').version);
  res.send(html);
});

// ================= INSECURE DESERIALIZATION DEMO =================
// Route: POST /deserialize
// Expects body: { "data": "{\"exploit\":\"_$$ND_FUNC$$_function(){ console.log('HACKED'); }\"}" }

app.post('/deserialize', (req, res) => {
  try {
    const { data } = req.body;

    // 🚨 INSECURE: Deserializing untrusted user input
    const obj = serialize.unserialize(data);

    if (typeof obj.exploit === 'function') {
      obj.exploit(); // If the payload includes a function, this will run!
    }

    res.send(`Deserialized object: ${JSON.stringify(obj)}`);
  } catch (err) {
    console.error('Deserialization error:', err.message);
    res.status(500).send('Deserialization failed.');
  }
});


// Server start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
