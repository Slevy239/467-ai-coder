# 🛡️ Cross-Site Scripting (XSS)

## 📌 Summary

**Vulnerability Type:** Cross-Site Scripting (XSS)  
**Tested On Component(s):** `Todo`, `Register`, `Login`, and all user-input/output flows  
**OWASP Reference:** [OWASP Top 10 Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/)

Cross-Site Scripting (XSS) occurs when an attacker is able to inject malicious scripts into content that is then rendered and executed in the browsers of other users. This can lead to session hijacking, credential theft, defacement, or redirection to malicious sites.

---

## 🚨 Description of the Vulnerability

In the vulnerable version of the application, user input (such as todo content or usernames) was rendered directly into the DOM without sanitization or escaping. This allowed attackers to inject JavaScript code, which would execute in the context of other users' browsers.

**Example Attack:**
- A user adds a todo with the content `<script>alert('XSS')</script>`.
- When another user views the todo list, the script executes, potentially stealing cookies or session tokens.

---

## 💥 Demonstration of the Attack

**Example of what such an attack would look like:**
1. Add a todo with the content: `<img src=x onerror="alert('XSS')">`
2. When the todo list is rendered, the alert box pops up, proving script execution.


  🛠️ Mitigation Strategy
Changes Made (in current code):

All user-generated content is rendered using React's default escaping, which prevents raw HTML/script injection.

The code never uses dangerouslySetInnerHTML for user content.
A strict Content Security Policy (CSP) is set via the backend using Helmet, reducing the risk of inline script execution.
Session tokens are stored in HTTP-only cookies, so even if an XSS vulnerability is found, tokens cannot be stolen via JavaScript.


Before (Vulnerable Rendering):

// BAD: Directly inserting user content as HTML
<li dangerouslySetInnerHTML={{ __html: todo.content }} />


After (Safe Rendering):
// GOOD: Render as plain text (React escapes by default)
<li>{todo.content}</li>


CSP Example (in server code):
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // ...other directives...
    },
  })
);

Attempts to try the above 1. Add a todo with the content: `<img src=x onerror="alert('XSS')">` will be a test and show that cross_site_scripting will not work. 

Scripts and event handlers are rendered as harmless text, not executed.
No alert boxes or JavaScript execution observed.
CSP header present and blocks inline scripts.


🧠 Lessons Learned
Never trust user input—always escape or sanitize before rendering.
Use React's default escaping and avoid dangerouslySetInnerHTML unless absolutely necessary (and always sanitize if used).
Implement a strong Content Security Policy (CSP) to provide defense-in-depth.
Store sensitive tokens in HTTP-only cookies to reduce XSS impact.
Review OWASP’s XSS Prevention Cheat Sheet for best practices.

