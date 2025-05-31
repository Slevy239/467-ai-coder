# Security Measures to Prevent Sensitive Data Exposure

## 1. Password Security
- All user passwords are hashed using bcrypt with a salt round of 10.
- Plaintext passwords are never stored or logged.
- During login, bcrypt compares input with the stored hash.

## 2. Environment Variables
- Sensitive DB credentials are stored in a `.env` file.
- `.env` is included in `.gitignore` to avoid source control leaks.

## 3. HTTPS
- The app is intended to be served over HTTPS in production.
- Secure cookies and HTTPS-only flags are enforced at the proxy layer.

## 4. Logging
- No sensitive user information (like password updates) is logged.
- Logs use user IDs instead of usernames where possible.

## 5. SQL Injection Prevention
- All SQL queries use parameterized statements.
- A vulnerable example (string interpolation) is included in comments for educational purposes.

## 6. Role-based Access (Admin Safety)
- Endpoints like `/users` and `/delete-user/:id` should be protected by an admin role check.
- The `role` field in the `users` table supports access differentiation.

## 7. API Hardening
- Sensitive fields (e.g., passwords) are never returned in API responses.
- Only minimal necessary data is returned to the frontend.

## 8. Principle of Least Privilege
- The PostgreSQL role used by the backend has limited access to required tables and operations only.
