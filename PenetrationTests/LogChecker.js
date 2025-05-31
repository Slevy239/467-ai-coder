import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// LOG PATHS
const safeLogPath = path.join(__dirname, '..', 'website-react', 'server.log');
const vulnLogPath = path.join(__dirname, '..', 'website-vulnerable', 'server.log');

// Time marker to check only recent entries
const testStartTime = new Date();

// Helper to read logs after a timestamp
function getNewLogs(filePath, sinceTime) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .trim()
    .split('\n')
    .filter(line => {
      const match = line.match(/^\[(.*?)\]/);
      if (!match) return false;
      return new Date(match[1]) >= sinceTime;
    });
}

async function runLoggingTest() {
  console.log('🧪 Starting logging test...');

  // Trigger loggable actions
  try {
    await axios.post('http://localhost:5000/login', {
      username: 'nonexistent',
      password: 'wrong'
    });
  } catch {}

  try {
    await axios.get('http://localhost:5000/admin');
  } catch {}

  try {
    await axios.post('http://localhost:5000/todos', {
      user_id: 1,
      content: 'Test log entry'
    });
  } catch {}

  // Allow logs to flush
  await new Promise(res => setTimeout(res, 300));

  // === SAFE SITE LOG CHECK ===
  const safeLogs = getNewLogs(safeLogPath, testStartTime);
  console.log('\n✅ Safe Site Log Check:');
  if (safeLogs.length > 0) {
    safeLogs.forEach(line => console.log('✔️', line));
    console.log(`→ ✅ ${safeLogs.length} safe log entries written.`);
  } else {
    console.log('❌ No new safe logs detected — logging may be insufficient');
  }

  // === VULNERABLE SITE LOG CHECK ===
  console.log('\n🚨 Vulnerable Site Log Check:');
  if (fs.existsSync(vulnLogPath)) {
    console.log(`❌ Vulnerable site SHOULD NOT have a log file, but found one at:\n${vulnLogPath}`);
    const lines = fs.readFileSync(vulnLogPath, 'utf-8').trim().split('\n');
    lines.forEach(line => console.log('❗', line));
  } else {
    console.log('✅ No log file found — vulnerable logging behavior confirmed.');
  }
}

runLoggingTest().catch(err => {
  console.error('❌ Test crashed:', err.message);
});
