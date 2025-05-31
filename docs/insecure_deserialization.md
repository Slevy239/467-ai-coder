# 📦 Insecure Deserialization

## 📌 Summary

**Vulnerability Type:** Insecure Deserialization  
**Tested On Component(s):** `/deserialize` route  
**OWASP Reference:** [OWASP Top 10 - A08:2021 – Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/)

Insecure Deserialization refers to the unsafe parsing of data where user input is blindly converted into objects. Attackers may use this to inject unexpected behavior, modify application logic, or execute arbitrary code — especially when deserialization occurs without validation.

---

## 🚨 Description of the Vulnerability

In the vulnerable implementation (`ISD_index.js`), the `/deserialize` route accepts user input and immediately deserializes it using `JSON.parse()` with no verification. This opens the door to prototype pollution, denial-of-service, or even command injection depending on what the deserialized object is later used for.

While JavaScript’s `JSON.parse()` is relatively safe compared to some language-specific object deserialization mechanisms (like Java or PHP), it’s still dangerous when used directly on untrusted data without constraints.

In this case, the application accepted JSON objects from the client and wrote their content to disk — allowing attackers to overwrite system files like `hacked.txt` or poison internal app state.

---

## 💥 Demonstration of the Attack

**Steps to Reproduce (using `ISD_index.js`):**
1. Craft a malicious payload with arbitrary keys and values.
2. Send a POST request to `/deserialize` with the payload.
3. Observe that a file (e.g., `hacked.txt`) is created or overwritten with attacker-controlled content.

**Proof of Exploit:**
```bash
curl -X POST http://localhost:3000/deserialize \
  -H "Content-Type: application/json" \
  -d '{"filePath": "server/hacked.txt", "data": "🔥 Injected!"}'
```

This causes the server to write `"🔥 Injected!"` to `server/hacked.txt`, demonstrating loss of control over file operations due to unsafe deserialization logic.

---

## 🛠️ Mitigation Strategy

**Changes Made (in `index.js`):**
- Introduced validation of incoming JSON structure using a schema check
- Restricted file paths to known-safe locations
- Implemented logging of attempted writes for audit purposes

**Before (Vulnerable Code in `ISD_index.js`):**
```js
app.post('/deserialize', (req, res) => {
  const obj = JSON.parse(req.body.payload); // ✅ parse, but 🚨 no validation
  fs.writeFileSync(obj.filePath, obj.data);
  res.send('Deserialized and written.');
});
```

**After (Secure Code in `index.js`):**
```js
app.post('/deserialize', authenticateToken, (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);

    if (typeof payload.data !== 'string' || payload.filePath !== 'output/safe.txt') {
      return res.status(400).json({ error: 'Invalid or unsafe input' });
    }

    fs.writeFileSync(payload.filePath, payload.data);
    res.send('Secure write complete.');
  } catch (err) {
    res.status(400).json({ error: 'Malformed JSON' });
  }
});
```

---

## ✅ Validation & Testing

**Test Tool:** `InsecureDeserialization.js`  
**Method:** Manual test script and payload fuzzing  
**Result:**
- Malicious writes to unauthorized locations are rejected
- Invalid JSON payloads return `400 Bad Request`
- Log entries confirm that attempted exploits are flagged

---

## 🧠 Lessons Learned

- **Never trust input from the client**, even when it’s JSON.
- Always **validate deserialized data** using a schema or strict key check.
- Limit operations (e.g., file access) to safe, predefined targets.
- Insecure deserialization isn’t always about code execution — **logic abuse or data tampering** is just as dangerous.
- Refer to [OWASP’s Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) for mitigation patterns in your language.

