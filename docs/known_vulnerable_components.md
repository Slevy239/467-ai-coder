# 🧨 Using Components with Known Vulnerabilities

## 📌 Summary

**Vulnerability Type:** Using Components with Known Vulnerabilities  
**Tested On Component(s):** Separate backend (`UVC_index.js`) using `serialize-javascript@1.6.1`  
**OWASP Reference:** [OWASP Top 10 - A06:2021 – Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)

Using outdated or vulnerable third-party packages can introduce severe risks into an application — even when your own code appears secure. According to OWASP, attackers often target well-known package vulnerabilities that are easily searchable in public databases like NVD or Snyk.

---

## 🚨 Description of the Vulnerability

The alternate backend (`UVC_index.js`) intentionally used version `1.6.1` of the `serialize-javascript` package, which is known to be vulnerable to **XSS (Cross-Site Scripting)** attacks due to insufficient escaping of unsafe characters in serialized JavaScript strings.

The vulnerability allowed malicious input to be injected and reflected back to the client, effectively enabling script execution in a browser. This is especially dangerous in server-rendered templates or when user input is serialized and sent in a script tag.

Although the core application was secure, using a vulnerable library (even in isolated components) demonstrates how dangerous indirect dependency risks can be.

---

## 💥 Demonstration of the Attack

**Steps to Reproduce (using `UVC_index.js` with `serialize-javascript@1.6.1`):**
1. Start the vulnerable backend.
2. Send a request with an input payload containing HTML/JS, e.g. `</script><script>alert('XSS')</script>`.
3. Observe that the payload is rendered in a script tag on the client side without escaping.

**Proof of Exploit:**
```bash
curl -X POST http://localhost:3000/serialize \
  -H "Content-Type: application/json" \
  -d '{"payload": "</script><script>alert(\"XSS\")</script>"}'
```

The response includes:
```html
<script>var data = "</script><script>alert(\"XSS\")</script>";</script>
```

This leads to immediate script execution in the browser.

---

## 🛠️ Mitigation Strategy

**Changes Made (in the secure version):**
- Upgraded `serialize-javascript` to version `>=3.1.0`, where the vulnerability is patched.
- Added output encoding in client-facing scripts to further reduce risk.
- Verified all other dependencies via `npm audit` and `npm outdated`.

**Before (Vulnerable Usage in `UVC_index.js`):**
```js
const serialize = require('serialize-javascript@1.6.1');

app.post('/serialize', (req, res) => {
  const result = serialize(req.body.payload);
  res.send(`<script>var data = ${result};</script>`);
});
```

**After (Secure Practice in main app):**
```js
const serialize = require('serialize-javascript'); // Updated version (>=3.1.0)

app.post('/serialize', (req, res) => {
  const safeOutput = serialize(req.body.payload, { isJSON: true });
  res.send(`<script>var data = ${safeOutput};</script>`);
});
```

---

## ✅ Validation & Testing

**Test Tool:** `UsingVulnerableComponents.js`  
**Method:** XSS payload injection via JSON, visual inspection in browser  
**Result:**
- `UVC_index.js` exhibits XSS with the vulnerable payload
- Patched backend correctly escapes and renders safe output
- `npm audit` confirms all known vulnerabilities are resolved in the secure version

---

## 🧠 Lessons Learned

- Always keep dependencies up to date — **even “minor” packages can carry critical security bugs**.
- Use `npm audit`, `npm outdated`, and tools like `Snyk` or `Dependabot` to continuously monitor dependencies.
- Assume that **indirect/transitive dependencies** also carry risk.
- Review OWASP guidance on [Software Composition Analysis (SCA)](https://owasp.org/www-project-dependency-check/) to automate detection.
