const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Blob } = require('buffer');
const { execFileSync, spawnSync } = require('child_process');

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function fileExists(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
}

function canExecute(bin, args = ['--help']) {
  if (!bin) return false;
  try {
    const r = spawnSync(bin, args, { stdio: 'ignore' });
    return r.status === 0 || r.status === 1;
  } catch {
    return false;
  }
}

function pickWhisperCppBinary() {
  const fromEnv = String(process.env.WHISPER_CPP_BIN || '').trim();
  if (fromEnv) return fromEnv;
  const candidates = ['whisper-cli', 'main'];
  for (const c of candidates) {
    if (canExecute(c)) return c;
  }
  return '';
}

function pickFfmpegBinary() {
  const fromEnv = String(process.env.FFMPEG_BIN || '').trim();
  if (fromEnv) return fromEnv;
  return 'ffmpeg';
}

async function transcribeWithWhisperCpp({ filePath, mimeType, language = 'th' } = {}) {
  const bin = pickWhisperCppBinary();
  const modelPath = String(process.env.WHISPER_CPP_MODEL || '').trim();

  if (!bin) {
    return {
      text: '',
      provider: 'whisper.cpp',
      disabled: true,
      disabledReason: 'missing_whispercpp_bin',
      hint: 'Install whisper.cpp (whisper-cli) and set WHISPER_CPP_MODEL to a gguf model path.',
    };
  }
  if (!modelPath || !fileExists(modelPath)) {
    return {
      text: '',
      provider: 'whisper.cpp',
      disabled: true,
      disabledReason: 'missing_whispercpp_model',
      hint: 'Set WHISPER_CPP_MODEL=/path/to/model.gguf (download a whisper.cpp gguf model first).',
    };
  }

  const ffmpeg = pickFfmpegBinary();
  if (!canExecute(ffmpeg, ['-version'])) {
    return {
      text: '',
      provider: 'whisper.cpp',
      disabled: true,
      disabledReason: 'missing_ffmpeg',
      hint: 'Install ffmpeg (required to convert LINE audio to 16k mono wav).',
    };
  }

  const tmpDir = os.tmpdir();
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const wavPath = path.join(tmpDir, `stt-${id}.wav`);
  const outBase = path.join(tmpDir, `stt-${id}`);

  try {
    // Convert to 16kHz mono PCM wav for best compatibility with whisper.cpp
    execFileSync(ffmpeg, ['-y', '-i', filePath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wavPath], {
      stdio: 'ignore',
    });

    // whisper.cpp CLI (common flags): -m model -f input.wav -l th -otxt -of outBase
    execFileSync(bin, ['-m', modelPath, '-f', wavPath, '-l', language || 'th', '-otxt', '-of', outBase], {
      stdio: 'ignore',
    });

    const outTxt1 = `${outBase}.txt`;
    const outTxt2 = `${outBase}.wav.txt`;
    const outTxt = fileExists(outTxt1) ? outTxt1 : (fileExists(outTxt2) ? outTxt2 : '');
    if (!outTxt) throw new Error('whisper.cpp did not produce a .txt output');

    const text = String(fs.readFileSync(outTxt, 'utf8') || '').trim();
    return { text, provider: 'whisper.cpp', model: path.basename(modelPath) };
  } finally {
    try { if (fileExists(wavPath)) fs.unlinkSync(wavPath); } catch {}
    try { if (fileExists(`${outBase}.txt`)) fs.unlinkSync(`${outBase}.txt`); } catch {}
    try { if (fileExists(`${outBase}.wav.txt`)) fs.unlinkSync(`${outBase}.wav.txt`); } catch {}
  }
}

async function transcribeWithOpenAI({ filePath, mimeType, language = 'th' } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: '', provider: 'openai', disabled: true, disabledReason: 'missing_openai_api_key' };
  }

  const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
  const url = process.env.OPENAI_TRANSCRIBE_URL || 'https://api.openai.com/v1/audio/transcriptions';

  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: mimeType || 'application/octet-stream' });
  const form = new FormData();
  form.append('model', model);
  if (language) form.append('language', language);
  form.append('file', blob, path.basename(filePath));

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OPENAI_TRANSCRIBE_TIMEOUT_MS || 60000) || 60000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const text = await res.text();
    const data = safeJson(text) || {};
    if (!res.ok) {
      const msg = data?.error?.message || text || `OpenAI transcription failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return { text: String(data.text || '').trim(), provider: 'openai', model };
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeAudioFile({ filePath, mimeType, language } = {}) {
  const provider = String(process.env.STT_PROVIDER || '').trim().toLowerCase(); // 'openai'|'whispercpp'|'auto'

  if (provider === 'whispercpp' || provider === 'whisper.cpp') {
    return transcribeWithWhisperCpp({ filePath, mimeType, language });
  }
  if (provider === 'openai') {
    return transcribeWithOpenAI({ filePath, mimeType, language });
  }

  // auto (default): prefer OpenAI if configured; otherwise try whisper.cpp if installed.
  const openai = await transcribeWithOpenAI({ filePath, mimeType, language });
  if (!openai?.disabled) return openai;

  const local = await transcribeWithWhisperCpp({ filePath, mimeType, language });
  if (!local?.disabled) return local;

  return {
    text: '',
    provider: 'auto',
    disabled: true,
    disabledReason: 'no_stt_provider',
    hint: 'Set OPENAI_API_KEY, or install whisper.cpp + ffmpeg and set WHISPER_CPP_MODEL.',
  };
}

module.exports = { transcribeAudioFile };
