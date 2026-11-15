// Recording an appointment, and the visit page: recordings, transcript and highlights.
import { fill, h, icon, button, field, toast, clear, confirmDialog, modal, pickFiles, readFileBytes } from '../dom.mjs';
import { app as appState, go } from '../main.mjs';
import { VISIT_TYPES, fmtDate } from '../../health/model.mjs';
import { VisitRecorder, canRecord, localSpeechStatus, installLocalSpeech, startLocalSpeech } from '../recorder.mjs';
import { parseTranscript, highlights, fmtClock, followUpDate } from '../../health/transcript.mjs';
import { fromUtf8 } from '../../lib/bytes.mjs';

const MARKS = [['medication', 'Medicine', 'pill'], ['instruction', 'Instruction', 'note'], ['followup', 'Follow-up', 'calendar'], ['question', 'Question', 'chat'], ['important', 'Important', 'flag']];
const CONSENT = 'Everyone in the conversation agreed to be recorded.';

export async function recorder(app, space, rid) {
  const pk = space.membership.kind;
  if (!space.canWrite()) return h('div', h('h1', 'View only'), h('p', 'You can view this profile but not add recordings.'));
  const existing = rid ? space.get(rid) : null;
  const root = h('div.page-inner.recorder');
  const providers = space.list('provider').map((p) => p.data.name);
  const setup = { type: existing?.data.type || VISIT_TYPES[pk][0], provider: existing?.data.provider || '', reason: existing?.data.reason || '' };
  appState.hold = true;

  const drawSetup = async () => {
    const type = h('select', VISIT_TYPES[pk].map((t) => h('option', { value: t, selected: t === setup.type }, t)));
    const provider = h('input', { type: 'text', list: 'providers', value: setup.provider, placeholder: pk === 'pet' ? 'e.g. Dr. Patel, Riverside Vet' : 'e.g. Dr. Lee' });
    const reason = h('input', { type: 'text', value: setup.reason, placeholder: 'e.g. Annual check-up' });
    const consent = h('input', { type: 'checkbox' });
    const start = button('Start recording', null, { kind: 'primary big', iconName: 'mic', disabled: true });
    consent.addEventListener('change', () => { start.disabled = !consent.checked; });
    const speech = h('div.speech-status', h('span.muted', 'Checking whether this browser can transcribe on the device…'));
    let speechState = 'unavailable';
    localSpeechStatus().then((s) => {
      speechState = s;
      clear(speech);
      if (s === 'available') speech.append(icon('check', { size: 16 }), ' Live transcript is on. Speech is turned into text on this device; nothing is sent anywhere.');
      else if (s === 'downloadable') speech.append(icon('download', { size: 16 }), ' This browser can transcribe on the device after a one-time download of its speech model. ',
        button('Download it', async () => { try { await installLocalSpeech(); speechState = 'available'; fill(speech, icon('check', { size: 16 }), ' Ready: live transcript is on.'); } catch { toast('The browser did not install it', 'error'); } }, { small: true }));
      else speech.append(icon('lock', { size: 16 }), ' Live transcript is off. This browser can only transcribe by sending audio to its maker’s servers, so Evolve Health doesn’t use it. The recording still saves, and you can add a transcript afterwards (for example from your phone’s recorder app).');
    });
    start.addEventListener('click', () => {
      Object.assign(setup, { type: type.value, provider: provider.value.trim(), reason: reason.value.trim() });
      drawRecording(speechState === 'available');
    });
    fill(root, 
      h('a.back', { href: `#/p/${space.id}` }, icon('back', { size: 16 }), 'Back'),
      h('h1', 'Record an appointment'),
      canRecord() ? null : h('div.callout.warn', icon('alert'), h('div', 'This browser can’t record audio. You can still write notes and add a recording made elsewhere.')),
      h('datalist', { id: 'providers' }, providers.map((p) => h('option', { value: p }))),
      h('div.form-grid', field({ label: 'Kind of visit' }, type), field({ label: 'With' }, provider), field({ label: 'Reason' }, reason)),
      h('section.panel.consent', h('h2', icon('people'), ' Ask first'),
        h('p', 'Ask the ', pk === 'pet' ? 'vet' : 'doctor', ' and anyone else present before you record. In many places, including California and about a dozen other US states, everyone in a conversation has to agree to be recorded. Most providers are happy to say yes; some will want to know it’s for your own notes.'),
        h('label.check.important', consent, h('span', h('strong', 'Everyone in the conversation agreed to be recorded.')))),
      speech,
      h('p.hint', 'The recording is encrypted into this profile as soon as you stop. While recording, the screen stays on and Evolve Health won’t auto-lock.'),
      h('div.actions', button('Cancel', () => go(`#/p/${space.id}`)), canRecord() ? start : null));
  };

  const drawRecording = async (liveSpeech) => {
    const rec = new VisitRecorder();
    const segments = [];
    const level = h('span.level-bar');
    const timer = h('span.timer', '0:00');
    const interim = h('p.interim');
    const live = h('ol.live-transcript');
    const markList = h('ol.marks');
    const notes = h('textarea', { rows: 3, placeholder: 'Quick notes (optional)' });
    let speech = null, wake = null, tick;
    try {
      await rec.start({ onLevel: (v) => level.style.setProperty('--level', String(v)) });
    } catch (err) {
      toast(err.name === 'NotAllowedError' ? 'Microphone permission was denied' : `Could not start recording: ${err.message}`, 'error');
      return drawSetup();
    }
    appState.recording = true;
    try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
    if (liveSpeech) {
      try {
        speech = startLocalSpeech({
          elapsed: () => rec.elapsed,
          onSegment: (s) => { segments.push(s); live.append(h('li', h('span.t', fmtClock(s.t)), ' ', s.text)); live.scrollTop = live.scrollHeight; },
          onInterim: (t) => { interim.textContent = t; },
        });
      } catch { speech = null; }
    }
    tick = setInterval(() => { timer.textContent = fmtClock(rec.elapsed); }, 250);
    const pauseBtn = button('Pause', () => {
      if (rec.state === 'recording') { rec.pause(); speech?.pause(); pauseBtn.lastChild.textContent = 'Resume'; root.classList.add('paused'); }
      else { rec.resume(); speech?.resume(); pauseBtn.lastChild.textContent = 'Pause'; root.classList.remove('paused'); }
    }, { iconName: 'pause' });
    const finish = async (save) => {
      clearInterval(tick);
      speech?.stop();
      wake?.release?.().catch?.(() => {});
      appState.recording = false;
      if (!save) { rec.cancel(); go(`#/p/${space.id}`); return; }
      fill(root, h('div.spinner', h('span.dot'), h('span', 'Encrypting the recording…')));
      const audio = await rec.stop();
      const file = await space.saveFile(audio.bytes, { name: `appointment-${new Date().toISOString().slice(0, 10)}.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'}`, type: audio.type });
      const recording = { file, duration: Math.round(audio.duration), type: audio.type, markers: audio.markers, consent: { statement: CONSENT, at: new Date().toISOString() }, at: new Date().toISOString() };
      const base = existing ? structuredClone(space.get(existing.rid).data) : {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), status: 'finished', ...setup,
      };
      base.recordings = [...(base.recordings || []), recording];
      if (segments.length) base.transcript = [...(base.transcript || []), ...segments.map((s) => ({ ...s, rec: base.recordings.length - 1 }))];
      if (notes.value.trim()) base.summary = [base.summary, notes.value.trim()].filter(Boolean).join('\n');
      const id = await space.put('visit', base, existing?.rid);
      appState.hold = false;
      toast('Recording saved and encrypted');
      go(`#/p/${space.id}/r/${id}`);
    };
    fill(root, 
      h('div.rec-head', h('span.rec-dot', { 'aria-hidden': 'true' }), h('strong', 'Recording'), timer, h('span.level', level)),
      h('p.muted', [setup.type, setup.provider].filter(Boolean).join(' · ')),
      h('section.panel', h('h2', 'Mark a moment'), h('p.hint', 'Tap when something important is said. You can jump straight to it later.'),
        h('div.mark-buttons', MARKS.map(([type, label, ic]) => button(label, () => { const m = rec.mark(type, label); markList.prepend(h('li', h('span.t', fmtClock(m.t)), ' ', label)); toast(`${label} marked at ${fmtClock(m.t)}`); }, { iconName: ic }))),
        markList),
      liveSpeech ? h('section.panel', h('h2', 'Live transcript (on this device)'), live, interim) : null,
      field({ label: 'Notes' }, notes),
      h('div.actions.rec-actions', button('Discard', async () => { if (await confirmDialog('Discard this recording?', 'Nothing will be saved.', { ok: 'Discard', danger: true })) finish(false); }, { kind: 'ghost' }), pauseBtn,
        button('Stop and save', () => finish(true), { kind: 'primary', iconName: 'stop' })));
  };

  await drawSetup();
  return root;
}

/** Shown inside the record page for appointments. */
export async function visitDetail(app, space, r) {
  const d = r.data;
  const canWrite = space.canWrite();
  const players = [];
  let current = null;
  const seek = async (t, idx = 0) => {
    const p = players[idx] || players[0];
    if (!p) return;
    await p.load();
    p.audio.currentTime = t;
    p.audio.play().catch(() => {});
    current = p;
  };

  const blocks = [];
  if (d.summary) blocks.push(h('section.panel', h('h2', 'What they said'), h('p.pre', d.summary)));
  if (d.instructions) blocks.push(h('section.panel', h('h2', 'Instructions'), h('p.pre', d.instructions)));
  if (d.questions) blocks.push(h('section.panel', h('h2', 'Questions for next time'), h('p.pre', d.questions)));
  if (d.followUp) {
    const hasNext = space.list('visit').some((v) => v.data.status === 'planned' && v.data.date?.slice(0, 10) === d.followUp);
    blocks.push(h('div.callout.info', icon('calendar'), h('div', h('strong', `Follow up by ${fmtDate(d.followUp)}`),
      canWrite && !hasNext ? button('Add it as an upcoming appointment', () => go(`#/p/${space.id}/new/visit?status=planned&type=${encodeURIComponent(d.type || '')}&provider=${encodeURIComponent(d.provider || '')}&reason=${encodeURIComponent(`Follow-up${d.reason ? `: ${d.reason}` : ''}`)}&date=${d.followUp}T09:00`), { small: true }) : null)));
  }

  for (const [i, rec] of (d.recordings || []).entries()) {
    const box = h('div.player');
    const p = {
      audio: null,
      async load() {
        if (this.audio) return;
        const bytes = await app.vault.readFile(space, rec.file);
        this.audio = h('audio', { controls: true, preload: 'auto', src: URL.createObjectURL(new Blob([bytes], { type: rec.type })) });
        fill(box, this.audio);
      },
    };
    players.push(p);
    box.append(button(`Play recording${d.recordings.length > 1 ? ` ${i + 1}` : ''} (${fmtClock(rec.duration)})`, async () => { try { await p.load(); p.audio.play(); } catch (err) { toast(err.message, 'error'); } }, { iconName: 'play' }));
    blocks.push(h('section.panel.recording', h('h2', icon('mic'), ` Recording${d.recordings.length > 1 ? ` ${i + 1}` : ''}`),
      h('p.muted', `${fmtClock(rec.duration)} · recorded ${new Date(rec.at).toLocaleString()} · ${rec.consent ? 'consent confirmed' : 'consent not recorded'}`),
      box,
      rec.markers?.length ? h('ol.marks', rec.markers.map((m) => h('li', h('button.link', { type: 'button', onClick: () => seek(m.t, i) }, h('span.t', fmtClock(m.t)), ` ${m.label}`)))) : null));
  }

  const segments = d.transcript || [];
  const marks = (d.recordings || []).flatMap((rec, i) => (rec.markers || []).map((m) => ({ ...m, rec: i })));
  const found = highlights(segments);
  if (segments.length || canWrite) {
    blocks.push(h('section.panel.transcript',
      h('div.list-head', h('h2', icon('note'), ' Transcript'), canWrite ? button(segments.length ? 'Replace' : 'Add a transcript', () => addTranscript(space, r), { small: true, iconName: 'upload' }) : null),
      segments.length ? h('ol.segments', segments.map((s) => h('li', s.t !== null && s.t !== undefined && players.length ? h('button.link.t', { type: 'button', onClick: () => seek(s.t, s.rec || 0), title: 'Play from here' }, fmtClock(s.t)) : s.t !== null && s.t !== undefined ? h('span.t', fmtClock(s.t)) : null, ' ', s.speaker ? h('strong', `${s.speaker}: `) : null, s.text)))
        : h('p.muted', 'No transcript yet. Paste text or import a .txt, .vtt, .srt or Whisper .json file from a recorder or transcription app.')));
  }
  if (found.length || marks.length) {
    blocks.push(h('section.panel.highlights', h('h2', icon('flag'), ' Worth a second look'),
      h('p.hint', 'Sentences that mention medicines, follow-ups, tests, warning signs or instructions, found by simple word matching. Always check against the recording.'),
      h('ul.list', found.map((x) => h('li.highlight', { class: x.type },
        h('span.badge', x.label),
        h('span.row-main', x.t !== null && x.t !== undefined && players.length ? h('button.link.t', { type: 'button', onClick: () => seek(x.t, x.rec || 0) }, fmtClock(x.t)) : null, ' ', x.text),
        canWrite ? h('div.row', highlightActions(space, r, x)) : null)))));
  }
  return h('div.stack', blocks);
}

function highlightActions(space, r, x) {
  const append = (field) => async () => {
    const d = structuredClone(space.get(r.rid).data);
    d[field] = [d[field], x.text].filter(Boolean).join('\n');
    await space.put('visit', d, r.rid);
    toast(field === 'instructions' ? 'Added to instructions' : 'Added to the summary');
  };
  const out = [];
  if (x.type === 'medication') out.push(button('Add medicine', () => go(`#/p/${space.id}/new/medication?notes=${encodeURIComponent(`From appointment on ${fmtDate(r.data.date)}: “${x.text}”`)}&prescriber=${encodeURIComponent(r.data.provider || '')}`), { small: true, iconName: 'pill' }));
  if (x.type === 'followup') {
    const date = followUpDate(x.text, new Date(r.data.date || Date.now()));
    if (date) out.push(button(`Follow up ${fmtDate(date)}`, async () => { const d = structuredClone(space.get(r.rid).data); d.followUp = date; await space.put('visit', d, r.rid); toast('Follow-up date set'); }, { small: true, iconName: 'calendar' }));
  }
  out.push(button(['instruction', 'warning'].includes(x.type) ? 'Add to instructions' : 'Add to summary', append(['instruction', 'warning'].includes(x.type) ? 'instructions' : 'summary'), { small: true, iconName: 'plus' }));
  return out;
}

async function addTranscript(space, r) {
  const text = h('textarea', { rows: 10, placeholder: 'Paste the transcript here' });
  const result = await modal((close) => h('div.dialog-body',
    h('h2', 'Add a transcript'),
    h('p', 'Paste text, or choose a file exported from a recorder or transcription app (.txt, .vtt, .srt or Whisper .json). Timestamps are kept so you can jump to that moment in the recording.'),
    text,
    h('div.actions',
      button('Choose file', async () => { const [f] = await pickFiles({ multiple: false, accept: '.txt,.vtt,.srt,.json,text/*' }); if (f) text.value = fromUtf8(await readFileBytes(f)); }, { iconName: 'upload' }),
      button('Cancel', () => close(null)),
      button('Save', () => close(text.value), { kind: 'primary' }))), { label: 'Add a transcript', wide: true });
  if (!result?.trim()) return;
  const segments = parseTranscript(result);
  const d = structuredClone(space.get(r.rid).data);
  d.transcript = segments;
  await space.put('visit', d, r.rid);
  toast(`Transcript saved (${segments.length} lines)`);
}
