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
