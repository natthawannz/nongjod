#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

async function getNgrokUrl() {
  try {
    const res = execSync('curl -sS http://127.0.0.1:4040/api/tunnels').toString();
    const j = JSON.parse(res);
    if (j.tunnels && j.tunnels.length) return j.tunnels[0].public_url.replace(/\/$/, '');
  } catch (e) {
    // ignore
  }
  return null;
}

async function post() {
  const url = await getNgrokUrl();
  if (!url) {
    console.error('ngrok public URL not found (is ngrok running?)');
    process.exit(2);
  }
  const webhook = url + '/webhooks/line';
  const payload = {
    destination: 'U766438f1b89fa56e78316a60155e6a93',
    events: [
      {
        type: 'message',
        message: { type: 'text', id: '598984696419844288', text: 'จ่าย 120 ค่าข้าว' },
        webhookEventId: '01KG9R9VDC57NTH8HBYAYD3JED',
        deliveryContext: { isRedelivery: false },
        timestamp: Date.now(),
        source: { type: 'user', userId: 'U2e48d1afad81f5d21d5b001326d55cf3' },
        replyToken: '404bbd628c884e858c661c4d4e5a67e8',
        mode: 'active'
      }
    ]
  };
  const body = JSON.stringify(payload);
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64');

  const parsed = new URL(webhook);
  const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Line-Signature': signature } };
  const lib = parsed.protocol === 'https:' ? https : http;
  const req = lib.request(parsed, opts, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
      console.log('POST response', res.statusCode, data);
      // quick check call to find_by_line_user
      try {
        const out = execSync(`node ${__dirname}/find_by_line_user.js U2e48d1afad81f5d21d5b001326d55cf3`, { stdio: 'inherit' });
      } catch (e) {
        // ignore
      }
    });
  });
  req.on('error', (err) => { console.error('post error', err); process.exit(1); });
  req.write(body);
  req.end();
}

post().catch(e => { console.error(e); process.exit(1); });
