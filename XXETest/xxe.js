import axios from 'axios';

const xmlPayloads = [
  `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE foo [
    <!ELEMENT foo ANY >
    <!ENTITY xxe SYSTEM "file:///etc/passwd" >
  ]>
  <todo>
    <id>5</id>
    <user_id>1</user_id>
    <content>second run</content>
  </todo>`,

  `<todo>
    <id>5</id>
    <user_id>1</user_id>
    <content>second run</content>
  </todo>`
];

async function runAllXXETests() {
  for (let i = 0; i < xmlPayloads.length; i++) {
    const xml = xmlPayloads[i];
    try {
      const response = await axios.post('http://localhost:5000/edit-todo-xml', xml, {
        headers: { 'Content-Type': 'application/xml' }
      });

      console.log(`Test #${i + 1} response:`);
      console.log(response.data);

      if (typeof response.data === 'string' && response.data.includes('root:')) {
        console.log('Potential XXE vulnerability detected!');
      } else {
        console.log('No XXE detected in this test.');
      }
    } catch (err) {
      console.error(`Test #${i + 1} error:`, err.response?.data || err.message);
    }
  }
}

runAllXXETests();
