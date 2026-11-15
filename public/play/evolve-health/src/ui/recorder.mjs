// Recording an appointment in the browser. Audio never leaves the device unencrypted: it is
// recorded with MediaRecorder, then encrypted into the profile like any other file.
//
// Live transcription is used ONLY when the browser can guarantee it runs on the device
// (the Web Speech API's on-device mode). Ordinary Web Speech recognition sends audio to the
// browser maker's servers, so Evolve Health never falls back to it.

const TYPES = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

export const canRecord = () => typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

export class VisitRecorder {
  constructor() { this.markers = []; this.chunks = []; this.elapsedBefore = 0; this.startedAt = 0; this.state = 'idle'; }

  get elapsed() { return this.elapsedBefore + (this.state === 'recording' ? (performance.now() - this.startedAt) / 1000 : 0); }

  async start({ onLevel } = {}) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
    this.type = (this.recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
    this.recorder.ondataavailable = (e) => { if (e.data?.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
    this.startedAt = performance.now();
    this.state = 'recording';
    if (onLevel && typeof AudioContext !== 'undefined') {
      this.audio = new AudioContext();
      const analyser = this.audio.createAnalyser();
      analyser.fftSize = 512;
      this.audio.createMediaStreamSource(this.stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (this.state === 'idle') return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) ** 2;
        onLevel(this.state === 'recording' ? Math.min(1, Math.sqrt(sum / buf.length) / 40) : 0);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  mark(type, label) { const m = { t: Math.round(this.elapsed * 10) / 10, type, label }; this.markers.push(m); return m; }

  pause() {
    if (this.state !== 'recording') return;
    this.recorder.pause();
    this.elapsedBefore = this.elapsed;
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.recorder.resume();
    this.startedAt = performance.now();
    this.state = 'recording';
  }

  async stop() {
    const duration = this.elapsed;
    const done = new Promise((resolve) => { this.recorder.onstop = resolve; });
    this.recorder.stop();
    await done;
    this.release();
    const blob = new Blob(this.chunks, { type: this.type });
    this.chunks = [];
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: this.type, duration, markers: this.markers };
  }

  cancel() {
    try { this.recorder?.stop(); } catch { /* already stopped */ }
    this.chunks = [];
    this.release();
  }

  release() {
    this.state = 'idle';
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audio?.close().catch(() => {});
  }
}

/** Is on-device speech recognition available? 'available' | 'downloadable' | 'unavailable'. */
export async function localSpeechStatus(lang = navigator.language || 'en-US') {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!SR) return 'unavailable';
  return Promise.race([probe(SR, lang), new Promise((r) => setTimeout(() => r('unavailable'), 4000))]);
}

async function probe(SR, lang) {
  try {
    if (typeof SR.available === 'function' && 'processLocally' in SR.prototype) {
      const s = await SR.available({ langs: [lang], processLocally: true });
      return s === 'downloading' ? 'downloadable' : s;
    }
    if (typeof SR.availableOnDevice === 'function') {
      const s = await SR.availableOnDevice(lang);
      return s === 'downloading' ? 'downloadable' : s;
    }
  } catch { /* fall through */ }
  return 'unavailable';
}

export async function installLocalSpeech(lang = navigator.language || 'en-US') {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (typeof SR?.install === 'function') return SR.install({ langs: [lang], processLocally: true });
  if (typeof SR?.installOnDevice === 'function') return SR.installOnDevice(lang);
  return false;
}

/** Start on-device live transcription. Calls onSegment({t, text}) for each final phrase. */
export function startLocalSpeech({ lang = navigator.language || 'en-US', elapsed, onSegment, onInterim }) {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  const rec = new SR();
  if ('processLocally' in rec) rec.processLocally = true;
  else if ('mode' in rec) rec.mode = 'ondevice-only';
  else throw new Error('This browser cannot promise to keep speech on the device');
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  let active = true;
  let phraseStart = null;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (phraseStart === null) phraseStart = Math.max(0, elapsed() - 2);
      if (res.isFinal) {
        const text = res[0].transcript.trim();
        if (text) onSegment({ t: Math.round(phraseStart * 10) / 10, text: text[0].toUpperCase() + text.slice(1) });
        phraseStart = null;
        onInterim?.('');
      } else onInterim?.(res[0].transcript);
    }
  };
  rec.onend = () => { if (active) try { rec.start(); } catch { /* stopped */ } };
  rec.start();
  return { stop() { active = false; try { rec.stop(); } catch { /* not running */ } }, pause() { active = false; rec.stop(); }, resume() { active = true; try { rec.start(); } catch { /* running */ } } };
}
