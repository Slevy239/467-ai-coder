// UVCTest/UsingVulnerableComponents.js
import axios from 'axios';

const baseURL = 'http://localhost:5000';
const url = `${baseURL}/serialize-demo`;

async function runFunctionInjectionTest() {
  console.log('[XSS] Testing function injection in /serialize-demo...');

  try {
    const res = await axios.get(url);
    console.log(`[XSS] ✅ Response received. Status: ${res.status}`);

    // Detect if function is injected in raw form
    const vulnerable = res.data.includes('alert(\'🚨 XSS via serialize-javascript function\')');
    if (vulnerable) {
      console.log(`[XSS] 🚨 Raw function found in response — vulnerable to XSS!`);
    } else {
      console.log(`[XSS] ✅ No raw function in response — likely safe.`);
    }
  } catch (err) {
    console.error(`[XSS] 💥 Request failed: ${err.message}`);
  }
}

runFunctionInjectionTest();
