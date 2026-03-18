const line = require('@line/bot-sdk');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node unlink_richmenu_from_user.js <lineUserId>');
  process.exit(1);
}

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.CHANNEL_TOKEN;
if (!token) {
  console.error('Missing LINE_CHANNEL_ACCESS_TOKEN env var');
  process.exit(1);
}

const client = new line.Client({ channelAccessToken: token });

(async () => {
  try {
    await client.unlinkRichMenuFromUser(userId);
    console.log('Unlinked rich menu from user:', userId);
  } catch (err) {
    console.error('unlinkRichMenuFromUser error', err && err.response ? err.response.data : err);
    process.exit(2);
  }
})();
