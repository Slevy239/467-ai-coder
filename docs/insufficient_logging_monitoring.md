# 📉 Insufficient Logging & Monitoring

## 📌 Summary

**Vulnerability Type:** Insufficient Logging & Monitoring  
**Tested On Component(s):** Critical routes such as `/todos`, `/admin`, `/deserialize`  
**OWASP Reference:** [OWASP Top 10 - A09:2021 – Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/)

Insufficient Logging & Monitoring occurs when a system fails to record or review security-relevant events, making it difficult to detect, respond to, or investigate suspicious behavior. According to OWASP, this issue contributes directly to undetected breaches and delayed incident response.

---

## 🚨 Description of the Vulnerability

Earlier versions of the application either lacked any logging or inconsistently recorded sensitive activity such as unauthorized access attempts, invalid logins, or unexpected input on critical routes like `/admin` or `/deserialize`.

This left the system blind to malicious behavior, especially during testing of other vulnerabilities like Broken Access Control or Insecure Deserialization.

The vulnerability is not specific to any route — rather, it reflects a **lack of coverage** across the application. Additionally, logs were not toggleable via environment variables, and write failures were silently ignored.

---

## 💥 Demonstration of the Issue

**Steps to Reproduce (on uninstrumented routes):**
1. Attempt to access `/admin` as a non-admin user.
2. Observe that the request is correctly blocked (403), but nothing is recorded in the logs.
3. Attempt deserialization with malformed JSON or invalid file paths.
4. Again, no trace of these attempts is recorded.

**Test Script (`LogChecker.js`):**
- Verifies if relevant security events are being recorded in `server.log`
- Confirms that toggling `LOGGING_ENABLED` disables logging as expected

---

## 🛠️ Mitigation Strategy

**Changes Made (in `index.js` and `logger.js`):**
- Introduced `logger.js` to centralize logging logic
- Logging behavior is gated by a `.env` flag: `LOGGING_ENABLED=true`
- Log messages include timestamps, source routes, and structured messages
- Failures to write logs are also caught and reported to the console

**Sample from `logger.js`:**
```js
const fs = require('fs');
const path = require('path');

const LOGGING_ENABLED = process.env.LOGGING_ENABLED === 'true';
const logPath = path.join(__dirname, '..', 'server.log');

function logEvent(message) {
  if (!LOGGING_ENABLED) return;

  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;

  fs.appendFile(logPath, logLine, (err) => {
    if (err) console.error('❌ Failed to write log:', err);
  });
}

module.exports = logEvent;
```

**Patched Route Example in `index.js`:**
```js
app.get('/admin', authenticateToken, (req, res) => {
  if (!req.user.is_admin) {
    logEvent(`🔒 Unauthorized admin access attempt by user ${req.user.id}`);
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  logEvent(`✅ Admin access granted to user ${req.user.id}`);
  res.send('Welcome to the admin panel.');
});
```

---

## ✅ Validation & Testing

**Test Tool:** `LogChecker.js`  
**Method:** Simulated attacks and benign requests  
**Result:**
- Logs are written for all access control denials and sensitive route usage
- Logs are toggled on/off by setting `LOGGING_ENABLED` in `.env`
- Log lines include precise timestamps and are human-readable
- Malformed requests are now traceable postmortem

---

## 🧠 Lessons Learned

- **Logs are your audit trail.** Without them, there is no visibility into what happened and when.
- **Logging alone is not enough** — it must be **monitored** or integrated into alerting pipelines (e.g., via log aggregation tools).
- Use `.env` flags to **toggle verbosity** in different environments (e.g., dev vs. prod).
- Follow OWASP’s recommendations by ensuring **sensitive events are logged**, such as:
  - Failed login attempts
  - Access denials
  - Input validation errors
  - Unexpected system failures
