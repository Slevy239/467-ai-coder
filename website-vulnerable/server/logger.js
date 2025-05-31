const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'log.txt');

function logEvent(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFile(logPath, logLine, (err) => {
    if (err) console.error('❌ Failed to write log:', err);
  });
}

module.exports = logEvent;
