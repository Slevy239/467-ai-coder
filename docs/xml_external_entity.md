# 📝 XML Todo API – Edit Todo via XML

This project includes an Express.js route that allows clients to update a Todo item using an XML payload. It demonstrates how to parse XML in a Node.js backend and also highlights security concerns such as **XXE (XML External Entity) attacks**.

---

## 📌 Endpoint

### `POST /edit-todo-xml`

Update a Todo item via an XML payload.

---

## 📥 Request

- **Content-Type:** `application/xml`

### Example Request Body

```xml
<todo>
  <id>1</id>
  <content>Buy groceries</content>
</todo>

📤 Response
✅ 200 OK

{
  "message": "Todo updated via XML"
}

❌ 400 Bad Request

{
  "message": "Invalid XML: missing id or content"
}

❌ 500 Internal Server Error

{
  "message": "Failed to update via XML"
}

🛡️ Security Warning: XXE (XML External Entity) Attacks
What is XXE?

XML External Entity (XXE) attacks exploit vulnerabilities in XML parsers that allow external entities to be defined and loaded. If your server processes XML insecurely, attackers may:

    📂 Read local files (e.g., /etc/passwd)

    🌐 Trigger Server-Side Request Forgery (SSRF)

    💥 Cause Denial of Service (DoS)

🧨 Malicious XXE Example

<?xml version="1.0"?>
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<todo>
  <id>1</id>
  <content>&xxe;</content>
</todo>

✅ How to Prevent XXE

Use a secure XML parser with external entities disabled. For example, if using fast-xml-parser:

const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false, // Prevent XXE
});

const parsed = parser.parse(req.body);

💡 Best Practices

    🧪 Validate and sanitize input XML.

    🔐 Disable entity expansion in the parser.

    📜 Log all updates and errors securely.

    💡 Prefer JSON over XML when possible for modern APIs.