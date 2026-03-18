# financial-tracker1.2

## Expose webhook (optional)

```bash
ngrok http 5050
```

## Upload LINE Rich Menu image (menuline.png)

Prereqs:
- Backend running on `http://localhost:5050`
- Set `LINE_CHANNEL_ACCESS_TOKEN` in `backend/.env`
- (Voice) Choose ONE speech-to-text provider:
  - OpenAI: set `OPENAI_API_KEY` in `backend/.env`
  - Free (local): install `ffmpeg` + `whisper.cpp` and set `STT_PROVIDER=whispercpp` + `WHISPER_CPP_MODEL=/path/to/model.gguf`
- (Voice optional) Set `KEEP_LINE_AUDIO=0` to delete audio after transcription (default keeps a playable file under `/uploads/line/audio/...`)

### Option A: Rich menu buttons send visible chat text (simple)

```bash
curl -X POST "http://localhost:5050/webhooks/line/richmenu/create" \
  -F "image=@backend/uploads/richmenu/menuline.png" \
  -F "name=menuline" \
  -F "chatBarText=เมนู" \
  -F "setDefault=1" \
  -F 'areas=[
    {"bounds":{"x":95,"y":125,"width":1425,"height":830},"action":{"type":"message","text":"จดเลย"}},
    {"bounds":{"x":1575,"y":110,"width":475,"height":420},"action":{"type":"message","text":"เข้าเว็บ"}},
    {"bounds":{"x":2015,"y":125,"width":395,"height":405},"action":{"type":"message","text":"สรุปวันนี้"}},
    {"bounds":{"x":1575,"y":550,"width":395,"height":405},"action":{"type":"message","text":"เข้าเว็บ"}},
    {"bounds":{"x":2020,"y":545,"width":400,"height":410},"action":{"type":"message","text":"เข้าเว็บ"}},
    {"bounds":{"x":95,"y":986,"width":1430,"height":345},"action":{"type":"uri","label":"ประกาศ","uri":"line://ti/p/@156twxxb"}},
    {"bounds":{"x":1575,"y":986,"width":840,"height":345},"action":{"type":"message","text":"help"}}
  ]'
```

### Option B: Rich menu buttons are silent (no user text bubble)

Uses LINE `postback` actions (the bot replies immediately, but the user doesn't send a text message).

```bash
curl -X POST "http://localhost:5050/webhooks/line/richmenu/create" \
  -F "image=@backend/uploads/richmenu/menuline.png" \
  -F "name=menuline" \
  -F "chatBarText=เมนู" \
  -F "setDefault=1" \
  -F 'areas=[
    {"bounds":{"x":95,"y":125,"width":1425,"height":830},"action":{"type":"postback","data":"action=quick_note"}},
    {"bounds":{"x":1575,"y":110,"width":475,"height":420},"action":{"type":"postback","data":"action=web_login"}},
    {"bounds":{"x":2015,"y":125,"width":395,"height":405},"action":{"type":"postback","data":"action=summary_today"}},
    {"bounds":{"x":1575,"y":550,"width":395,"height":405},"action":{"type":"postback","data":"action=web_login"}},
    {"bounds":{"x":2020,"y":545,"width":400,"height":410},"action":{"type":"postback","data":"action=web_login"}},
    {"bounds":{"x":95,"y":986,"width":1430,"height":345},"action":{"type":"uri","label":"ประกาศ","uri":"line://ti/p/@156twxxb"}},
    {"bounds":{"x":1575,"y":986,"width":840,"height":345},"action":{"type":"postback","data":"action=help"}}
  ]'
```
