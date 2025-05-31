# 🔐 Mitigating Sensitive Data Exposure

Sensitive data exposure is a common security vulnerability where confidential information (like passwords, tokens, credit card numbers, or personal data) is accidentally or maliciously exposed to unauthorized users.

This guide covers best practices and strategies to **prevent sensitive data from being leaked or improperly handled** in your application.

---

## 🚨 What is Sensitive Data Exposure?

Sensitive data exposure occurs when applications:

- Transmit data over unencrypted channels (e.g., HTTP instead of HTTPS)
- Store data in plaintext (e.g., passwords in databases or logs)
- Leak data in error messages, logs, or browser storage
- Improperly control access to protected resources

### Common Examples

- Plaintext passwords in databases
- API keys or tokens committed to public Git repositories
- Credit card numbers in URL parameters
- Personal data stored without encryption
- Leaked database backups

---

## ✅ Mitigation Strategies

### 1. **Use HTTPS Everywhere**

Always use HTTPS with a valid SSL/TLS certificate to encrypt data in transit.

- Redirect all HTTP requests to HTTPS
- Set HTTP Strict Transport Security (HSTS) headers

```bash
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

2. Encrypt Sensitive Data at Rest

Use strong encryption algorithms (e.g., AES-256) to protect data stored in databases or files.

    Encrypt personally identifiable information (PII)

    Store only necessary data

    Use secure key management practices

3. Hash and Salt Passwords

Never store passwords in plaintext. Use a strong hashing algorithm such as bcrypt, argon2, or PBKDF2 with a unique salt per user.

// Example using bcrypt in Node.js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);

4. Avoid Sensitive Data in URLs

Avoid passing sensitive information via query parameters or URLs, as these can be stored in logs or browser history.

// ❌ Bad
GET /reset-password?token=abc123

// ✅ Better
POST /reset-password (in body: { token: "abc123" })

5. Secure Storage and Logging

    Never log sensitive data such as passwords, tokens, or credit card numbers.

    Mask or omit sensitive fields from application logs.

    Avoid storing tokens, credentials, or secrets in localStorage or sessionStorage unless absolutely necessary.