# 🐍 SQL Injection

## 📌 Summary

**Vulnerability Type:** SQL Injection  
**Tested On Component(s):** All API endpoints that interact with the database (`/login`, `/register`, `/todos`, etc.)  
**OWASP Reference:** [OWASP Top 10 - A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)

SQL Injection occurs when user-supplied data is included in SQL queries without proper validation or escaping, allowing attackers to manipulate queries and access or modify data they should not.

---

## 🚨 Description of the Vulnerability

In the vulnerable version of the application, in the earlier versions of Index.js, user input was directly concatenated into SQL queries. This allowed attackers to inject malicious SQL code, potentially leading to:

- Unauthorized data access (e.g., viewing other users' data)
- Data modification or deletion
- Authentication bypass
- Complete database compromise

---


🛠️ Mitigation Strategy
Changes Made (in index.js):

All SQL queries now use parameterized queries (prepared statements) instead of string concatenation.
User input is never directly interpolated into SQL statements.
The PostgreSQL driver (pg) is used, which supports parameterized queries by default.

// BAD: Directly concatenating user input into SQL
const result = await db.query(
  `SELECT * FROM users WHERE username = '${req.body.username}' AND password = '${req.body.password}'`
);

// GOOD: Use parameterized queries
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );

✅ Validation & Testing
Test Tool: SQLInjection.js
Attempts to inject SQL via username, password, or todo content are unsuccessful.
Only valid credentials and authorized queries succeed.
No unauthorized data is returned or modified.


🧠 Lessons Learned
Never concatenate user input into SQL queries.
Always use parameterized queries or ORM methods that prevent injection.
Validate and sanitize user input as an additional layer of defense.
Regularly test for SQL injection using automated tools and manual payloads.
Review OWASP’s SQL Injection Prevention Cheat Sheet for best practices.