# 🔑 Broken Authentication

## 📌 Summary

**Vulnerability Type:** Broken Authentication  
**Tested On Component(s):** `/login`, `/register`, and all authenticated API routes  
**OWASP Reference:** [OWASP Top 10 Broken Authentication](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)

Broken Authentication occurs when application functions related to authentication and session management are implemented incorrectly, allowing attackers to compromise passwords, keys, or session tokens, or to exploit other implementation flaws to assume other users’ identities.

---

## 🚨 Description of the Vulnerability

In the vulnerable version of the application earlier versions of (`index.js`), authentication was weak or improperly implemented:

- Passwords were stored in plaintext in the database, making them easily retrievable if the database was compromised.
- passwords had no requirements on them. Could just be password
- Session tokens were stored in `localStorage`, exposing them to JavaScript and increasing the risk of theft via XSS.
- There was no mechanism to securely verify user identity on protected routes; tokens were not always validated.
- Sessions did not expire or could be reused indefinitely.

These issues could allow attackers to:
- Steal or guess user credentials
- Hijack user sessions
- Impersonate other users or escalate privileges

---

## 💥 Demonstration of the Attack

🛠️ Mitigation Strategy
Changes Made (in index.js):

Passwords are now hashed using bcrypt before being stored in the database.

Session tokens are issued as JWTs and stored in secure, HTTP-only cookies, making them inaccessible to JavaScript.

All protected routes use middleware to verify the JWT and authenticate the user.
Sessions have expiration times, and tokens are invalidated on logout.


🧠 Lessons Learned
Never store passwords in plaintext; always use a strong hashing algorithm like bcrypt.
Store session tokens in HTTP-only cookies to prevent access via JavaScript and reduce XSS risk.
Always validate authentication tokens on every protected route.
Implement session expiration and logout to reduce the risk of token reuse.
Review OWASP’s Authentication Cheat Sheet for best practices.

