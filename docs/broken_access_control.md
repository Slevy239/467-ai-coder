# 🔓 Broken Access Control

## 📌 Summary

**Vulnerability Type:** Broken Access Control  
**Tested On Component(s):** `/todos/:userId`, `/admin`, and `/dashboard` routes  
**OWASP Reference:** [OWASP Top 10 - A01: Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

Broken Access Control occurs when applications do not properly enforce user permissions, allowing unauthorized users to act outside their intended scope.

---

## 🚨 Description of the Vulnerability

In the vulnerable version of the application (`BAC_index.js`), access control was either improperly enforced or completely missing:

- Any logged-in user could retrieve or manipulate another user’s data by simply modifying the `userId` parameter in the route `/todos/:userId`.
- Admin-only routes such as `/admin` and `/dashboard` did not verify that the user was actually an administrator.

This violates the principle of least privilege. Without authorization checks on the backend, an attacker can:
- View or modify other users’ data
- Gain access to admin-only panels
- Potentially escalate privileges by exploring hidden or undocumented endpoints

---

## 💥 Demonstration of the Attack

**Steps to Reproduce (using `BAC_index.js`):**
1. Log in as a standard user (e.g., User ID 1).
2. Make a request to `/todos/2` to view another user's data.
3. Navigate to `/admin` or `/dashboard` directly — access is allowed without any admin check.

**Proof of Exploit:**
```bash
# Access another user's todos
curl -H "Authorization: Bearer <user1_token>" http://localhost:3000/todos/2

# Access admin route
curl -H "Authorization: Bearer <user1_token>" http://localhost:3000/admin
```

Both requests succeed in `BAC_index.js` even though the user should not have permission.

---

## 🛠️ Mitigation Strategy

**Changes Made (in `index.js`):**
- Created middleware `checkAccess` to ensure users can only access their own records.
- Added checks for `req.user.is_admin` on sensitive routes (`/admin`, `/dashboard`).
- Used JWTs to reliably identify the logged-in user and their role on the server side.

**Before (Vulnerable Code in `BAC_index.js`):**
```js
app.get('/todos/:userId', async (req, res) => {
  const todos = await db.getTodos(parseInt(req.params.userId));
  res.json(todos);
});

app.get('/admin', async (req, res) => {
  res.send('Welcome to the admin panel.');
});
```

**After (Secure Code in `index.js`):**
```js
function checkAccess(req, res, next) {
  const userId = parseInt(req.params.userId);
  if (req.user.id !== userId && !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  next();
}

app.get('/todos/:userId', authenticateToken, checkAccess, async (req, res) => {
  const todos = await db.getTodos(parseInt(req.params.userId));
  res.json(todos);
});

app.get('/admin', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  res.send('Welcome to the admin panel.');
});
```

---

## ✅ Validation & Testing

**Test Tool:** `BrokenAccessControl.js`  
**Method:** Manual cURL testing + test script  
**Result:**
- Requests from non-owners to `/todos/:userId` are now rejected with 403
- Non-admins are denied access to `/admin` and `/dashboard`
- JWT parsing and role-checking work correctly

---

## 🧠 Lessons Learned

- **Always enforce access control on the server**, regardless of frontend behavior.
- Use a **deny-by-default** approach and explicitly grant access only where appropriate.
- **JWT-based user verification** must be validated at every sensitive route.
- Review [OWASP’s Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html) for real-world best practices.
