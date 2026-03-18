const line = require('@line/bot-sdk');

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.CHANNEL_TOKEN;
if (!token) {
  console.error('Missing LINE_CHANNEL_ACCESS_TOKEN env var');
  process.exit(1);
}

const client = new line.Client({ channelAccessToken: token });

(async () => {
  try {
    const list = await client.getRichMenuList();
    console.log(JSON.stringify(list, null, 2));
  } catch (err) {
    console.error('getRichMenuList error', err && err.response ? err.response.data : err);
    process.exit(2);
  }
})();
