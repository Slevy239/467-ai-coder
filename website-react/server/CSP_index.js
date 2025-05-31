//This is a Content Security Policy (CSP) configuration for a web application.
const express = require('express');
const cors = require('cors');
const initDatabase = require('./initDB');
const { Pool } = require('pg');
require('dotenv').config();
const logEvent = require('./logger');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;






// Use helmet with CSP configuration
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"], // Allow resources from the same origin
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (if necessary)
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (if necessary)
      imgSrc: ["'self'", "data:"], // Allow images from the same origin and data URIs
      connectSrc: ["'self'", "http://localhost:5000"], // Allow API requests to the backend
      fontSrc: ["'self'", "https://fonts.googleapis.com"], // Allow fonts from Google Fonts
      objectSrc: ["'none'"], // Disallow <object>, <embed>, and <applet> elements
      frameSrc: ["'none'"], // Disallow iframes
    },
  })
);

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true }));



initDatabase();

// DB pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

// Routes
// ======================= REGISTER =======================
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
      [username, password, role || 'user']
    );

    const result = await pool.query('SELECT * FROM users');
    console.table(result.rows);

    logEvent(`User registered: ${username}`);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
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

    logEvent(`Password updated for "${username}"`);
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
      'SELECT * FROM users WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rows.length === 1) {
      const user = result.rows[0];
      res.status(200).json({ success: true, id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Get todos for a user by user ID
app.get('/todos/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM todos WHERE user_id = $1',
      [userId]
    );
    // logEvent(`Fetched TODO list for user_id: ${userId}`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching todos:', err.message);
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
app.post('/todos', async (req, res) => {
  const { user_id, content } = req.body;
  try {
    await pool.query(
      'INSERT INTO todos (user_id, content) VALUES ($1, $2)',
      [user_id, content]
    );
    logEvent(`User ${user_id} added a TODO: "${content}"`);
    res.status(201).json({ message: 'Todo added' });
  } catch (err) {
    console.error('Error adding todo:', err.message);
    res.status(500).json({ message: 'Failed to add todo' });
  }
});


// Update todo
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  try {
    await pool.query(
      'UPDATE todos SET content = $1 WHERE id = $2',
      [content, id]
    );
    logEvent(`Todo ID ${id} updated to: "${content}"`);
    res.json({ message: 'Todo updated' });
  } catch (err) {
    console.error('Error updating todo:', err.message);
    res.status(500).json({ message: 'Failed to update todo' });
  }
});

// Delete todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'DELETE FROM todos WHERE id = $1',
      [id]
    );
    logEvent(`Todo ID ${id} deleted`);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    console.error('Error deleting todo:', err.message);
    res.status(500).json({ message: 'Failed to delete todo' });
  }
});

// ========== AdminDashboard-safe endpoints ==========
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/delete-user/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.send('User deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
