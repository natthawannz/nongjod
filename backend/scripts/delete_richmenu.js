const line = require('@line/bot-sdk');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node delete_richmenu.js <richMenuId>');
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
    await client.deleteRichMenu(id);
    console.log('Deleted richMenuId=', id);
  } catch (err) {
    console.error('deleteRichMenu error', err && err.response ? err.response.data : err);
    process.exit(2);
  }
})();
