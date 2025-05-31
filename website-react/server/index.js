const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // <-- Added helmet require
const initDatabase = require('./initDB');
const { Pool } = require('pg');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const logEvent = require('./logger');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ ignoreAttributes: false, processEntities: false });
const serialize = require('serialize-javascript'); // Moved require here
const path = require('path');


const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://localhost:5000"],
      fontSrc: ["'self'", "https://fonts.googleapis.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  })
);

// // Serve static files from the React frontend
// app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

// // Your API routes go here

// // Catch-all: send back index.html for client-side routing
// app.get('/{*any}', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
// });

// CORS with origin allowed for frontend (adjust if your frontend URL differs)
// app.use(cors({ origin: 'http://localhost:3000' }));
app.use(cors({ origin: '*' }));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB (create tables etc.)
initDatabase();

// DB connection pool
// const pool = new Pool({
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
//   connectionString: process.env.DATABASE_URL
// });
const isProduction = true;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});


// ====== REGISTER ======
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

    const hashedPass = await (bcrypt.hash(password, SALT_ROUNDS))
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, hashedPass, role || 'user']
    );
    logEvent(`User registered: ${username}`);
    res.status(201).json({ success: true });
  } catch (error) {
    logEvent(`Registration error for ${username}: ${error.message}`);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});
// ======================= LOGIN =======================
// Update Password
app.put('/users/:username', async (req, res) => {
  const { username } = req.params;
  const { newPass } = req.body;

  try {
    const hashedPass = await bcrypt.hash(newPass, SALT_ROUNDS);
    console.log(hashedPass);
    await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPass, username]
    );

    logEvent(`Password updated for user ID: ${user.id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err.message);
    res.status(500).json({ message: 'Failed to update password' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 1) {
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        const token = generateToken(user);
        logEvent(`Login SUCCESS: ${username}`);
        return res.status(200).json({ token });
      } else {
        logEvent(`Login FAILURE (bad password): ${username}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    } else {
      logEvent(`Login FAILURE (user not found): ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
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

// ====== UPDATE TODO VIA XML ======
app.post('/edit-todo-xml', express.text({ type: 'application/xml' }), async (req, res) => {
  try {
    const parsed = xmlParser.parse(req.body);
    const id = parsed?.todo?.id;
    const content = parsed?.todo?.content;

    if (!id || !content) {
      return res.status(400).json({ message: 'Invalid XML: missing id or content' });
    }

    await pool.query('UPDATE todos SET content = $1 WHERE id = $2', [content, id]);

    logEvent(`Todo ID ${id} updated via XML`);
    res.json({ message: 'Todo updated via XML' });
  } catch (err) {
    console.error('XML update failed:', err.message);
    res.status(500).json({ message: 'Failed to update via XML' });
  }
});

// ====== SAFE SERIALIZE DEMO ======
app.get('/serialize-demo', (req, res) => {
  const xssFunction = () => {
    alert('🚨 This should not run');
  };

  // serialize-javascript escapes function properly
  const script = `<script>(${serialize(xssFunction, { isJSON: false })})();</script>`;

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


// ========== PATCHED: Secure Deserialization ==========
// Accepts only a plain JSON object with a known schema
app.post('/deserialize', (req, res) => {
  try {
    const { data } = req.body;
    logEvent(`Incoming deserialization request: ${data}`);

    const parsed = JSON.parse(data);

    if (typeof parsed !== 'object' || parsed === null) {
      logEvent('Rejected: Invalid object structure');
      return res.status(400).json({ error: 'Invalid object structure' });
    }

    const allowedKeys = ['name', 'message'];
    const keys = Object.keys(parsed);

    for (const key of keys) {
      if (!allowedKeys.includes(key)) {
        logEvent(`Rejected: Unexpected key "${key}"`);
        return res.status(400).json({ error: `Unexpected key: ${key}` });
      }
    }

    logEvent('Deserialization accepted and processed successfully');
    res.json({
      message: 'Deserialized safely',
      data: parsed
    });

  } catch (err) {
    logEvent(`Deserialization error: ${err.message}`);
    res.status(400).json({ error: 'Failed to safely parse input' });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});