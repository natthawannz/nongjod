// Quick test to simulate a LINE webhook POST locally
const http = require('http');

const textArg = process.argv.slice(2).join(' ').trim();
const messageText = textArg || 'จดรายการ';

const payload = {
  "destination": "U766438f1b89fa56e78316a60155e6a93",
  "events": [{
    "type": "message",
    "message": {
      "type": "text",
      "id": "598999691896029374",
      "text": messageText
    },
    "webhookEventId": "01KGA0TMGAA6S8GDWRJM8A31VW",
    "deliveryContext": { "isRedelivery": false },
    "timestamp": 1769862942734,
    "source": {
      "type": "user",
      "userId": "U2e48d1afad81f5d21d5b001326d55cf3"
    },
    "replyToken": "test-reply-token-12345",
    "mode": "active"
  }]
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: Number(process.env.PORT) || 5050,
  path: '/webhooks/line',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending test webhook to localhost:5050/webhooks/line');
console.log('Text in payload:', payload.events[0].message.text);

const req = http.request(options, (res) => {
  console.log(`Response status: ${res.statusCode}`);
  let data = '';
  res.on('data', (d) => {
    data += d;
  });
  res.on('end', () => {
    console.log('Response:', data);
    console.log('\n✓ Test completed. Check the OTHER terminal running "node index.js" for these logs:');
    console.log('  - LINE incoming rawText: ...');
    console.log('  - LINE cleaned text: ...');
    console.log('  - LINE parsed: ...');
    console.log('  - LINE flex trigger test: ...');
    console.log('  - LINE reply success/skipped ...');
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
  process.exit(1);
});

req.write(postData);
req.end();
