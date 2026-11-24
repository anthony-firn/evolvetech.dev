import {el, inline, prose} from './text.js';
import * as S from './state.js';
import {createPlayer} from './player.js';
import {runPython} from './runner.js';
import {coach, MODELS} from './coach.js';

const store = window.localStorage;
const app = document.querySelector('#app');
const status = document.querySelector('#status');
let state = S.load(store);
let index = [];
let episode = null;
let player = null;
const today = () => S.localDate();

function persist() { if (!S.save(store, state)) say('Progress could not be saved in this browser (private mode or full storage).'); }
function say(text) { status.textContent = text; }
async function getJSON(url) {
  const res = await fetch(url, {cache: 'no-cache'});
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  return res.json();
}

// Updates the finished stage and the stats in place, so test results and answers stay on screen.
function finish(stage, detail) {
  const gained = S.complete(state, episode.id, stage, today(), detail);
  persist();
  const card = document.getElementById(`stage-${stage}`);
  if (card) {
    card.classList.add('done');
    card.querySelector('.meta').textContent = 'Done';
    card.querySelectorAll('[data-hide-when-done]').forEach(n => n.remove());
  }
  document.querySelector('.stats')?.replaceWith(stats());
  const finished = gained && state.episodes[episode.id]?.doneOn === today();
  say(finished ? `+${gained} XP. Episode finished. Streak: ${S.streak(state, today())} days.` : gained ? `+${gained} XP` : '');
  return gained;
}

function stats() {
  const n = S.streak(state, today());
  const lvl = S.level(state.xp);
  const next = 50 * lvl * lvl;
  const prev = 50 * (lvl - 1) * (lvl - 1);
  const skills = Object.entries(S.skills(state, index)).sort((a, b) => b[1] - a[1]);
  return el('section', {class: 'stats', 'aria-label': 'Your progress'},
    el('div', {class: 'stat'}, el('b', {}, String(n)), el('span', {}, 'day streak')),
    el('div', {class: 'stat'}, el('b', {}, `Level ${lvl}`), el('span', {}, `${state.xp} XP`),
      el('progress', {max: next - prev, value: state.xp - prev, 'aria-label': 'Progress to next level'})),
    el('div', {class: 'skills'}, skills.length ? skills.slice(0, 6).map(([t, xp]) =>
      el('div', {class: 'skill'}, el('span', {}, t), el('meter', {min: 0, max: Math.max(100, skills[0][1]), value: xp}), el('small', {}, `${xp}`)))
      : el('p', {class: 'muted'}, 'Skills appear here as you finish stages.')));
}

function reviewDeck() {
  const due = S.dueCards(state, today());
  if (!due.length) return el('section', {class: 'review quiet'}, el('p', {}, 'No reviews due. Questions you answer come back after 1, 3, 7, 14 and 30 days, sooner if you miss them.'));
  return el('section', {class: 'review', 'aria-labelledby': 'review-h'},
    el('h2', {id: 'review-h'}, `Review · ${due.length} due`),
    el('p', {class: 'muted'}, 'Answer from memory first. These are questions from earlier episodes.'),
    due.map(card => {
      const out = el('p', {class: 'why', hidden: true});
      const box = el('div', {class: 'card'}, el('p', {class: 'q'}, inline(card.q)));
      const buttons = card.choices.map((choice, i) => el('button', {type: 'button', class: 'choice', onclick: () => {
        const right = i === card.answer;
        buttons.forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === card.answer); b.classList.toggle('wrong', j === i && !right); });
        const gained = S.review(state, card.id, right, today()); persist();
        out.hidden = false; out.replaceChildren(el('strong', {}, right ? `Right. +${gained} XP. ` : 'Not quite. '), ...inline(card.why));
      }}, inline(choice)));
      box.append(el('div', {class: 'choices'}, buttons), out);
      return box;
    }));
}

function stageCard(stage, title, minutes, body) {
  const done = S.stageDone(state, episode.id, stage);
  return el('section', {class: `stage-card${done ? ' done' : ''}`, id: `stage-${stage}`, 'aria-labelledby': `h-${stage}`},
    el('header', {}, el('span', {class: 'step'}, String(S.STAGES.indexOf(stage) + 1)),
      el('h2', {id: `h-${stage}`}, title), el('span', {class: 'meta'}, done ? 'Done' : `${minutes} min · ${stage === 'prove' ? `${S.XP.prove} XP each` : `${S.XP[stage]} XP`}`)),
    body);
}

function watch() {
  if (!player) player = createPlayer(episode.scenes, {onFinish: () => finish('watch')});
  return el('div', {}, player.root,
    el('details', {}, el('summary', {}, 'Read the script instead'), episode.scenes.map(s => el('p', {}, el('strong', {}, `${s.title}. `), ...inline(s.narration)))),
    S.stageDone(state, episode.id, 'watch') ? null : el('button', {type: 'button', 'data-hide-when-done': true, onclick: () => finish('watch')}, 'Mark as watched'));
}

function read() {
  return el('div', {class: 'reading'},
    episode.read.sections.map(s => el('article', {}, el('h3', {}, s.heading), prose(s.body))),
    el('h3', {}, 'Sources'),
    el('ul', {class: 'sources'}, episode.read.sources.map(s => el('li', {},
      el('a', {href: s.url, target: '_blank', rel: 'noopener noreferrer'}, s.title), s.note ? ` · ${s.note}` : ''))),
    S.stageDone(state, episode.id, 'read') ? null : el('button', {type: 'button', 'data-hide-when-done': true, onclick: () => finish('read')}, 'Done reading'));
}

function prove() {
  const prior = state.episodes[episode.id]?.stages.prove;
  const form = el('form', {class: 'quiz'});
  const blocks = episode.quiz.map((q, qi) => el('fieldset', {},
    el('legend', {}, `${qi + 1}. `, ...inline(q.q)),
    q.choices.map((c, ci) => el('label', {class: 'opt'}, el('input', {type: 'radio', name: q.id, value: String(ci), required: true}), el('span', {}, inline(c)))),
    el('p', {class: 'why', hidden: true})));
  form.append(...blocks, el('button', {type: 'submit', class: 'primary'}, prior ? 'Check again' : 'Check my answers'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    let correct = 0;
    episode.quiz.forEach((q, qi) => {
      const picked = Number(new FormData(form).get(q.id));
      const right = picked === q.answer;
      correct += right;
      const why = blocks[qi].querySelector('.why');
      why.hidden = false; why.className = `why ${right ? 'right' : 'wrong'}`;
      why.replaceChildren(el('strong', {}, right ? 'Right. ' : `Answer: ${q.choices[q.answer].replace(/[`*]/g, '')}. `), ...inline(q.why));
      if (!prior) S.schedule(state, {id: `${episode.id}:${q.id}`, episode: episode.id, q: q.q, choices: q.choices, answer: q.answer, why: q.why}, right, today());
    });
    if (prior) { say(`${correct}/${episode.quiz.length} this time. XP counts your first try.`); return; }
    const gained = finish('prove', {correct, total: episode.quiz.length});
    form.querySelector('button[type=submit]').textContent = 'Check again';
    say(`${correct}/${episode.quiz.length} correct, +${gained} XP. Missed questions come back tomorrow.`);
  });
  return el('div', {}, el('p', {class: 'muted'}, 'No AI for this part. Answer from what you watched and read; your first try is what counts.'),
    prior ? el('p', {class: 'score'}, `First try: ${prior.correct}/${prior.total} on ${prior.on}.`) : null, form);
}

function judge() {
  const j = episode.judgment;
  const prior = state.episodes[episode.id]?.stages.judge;
  const options = j.options.map((o, i) => {
    const why = el('p', {class: 'why', hidden: !prior});
    const btn = el('button', {type: 'button', class: 'choice', disabled: Boolean(prior), onclick: () => {
      options.forEach(({btn: b, why: w}, k) => { b.disabled = true; w.hidden = false; b.classList.add(j.options[k].verdict); });
      btn.classList.add('picked');
      finish('judge', {picked: i, verdict: o.verdict});
    }}, inline(o.text));
    why.replaceChildren(el('strong', {}, `${o.verdict === 'best' ? 'Strongest' : o.verdict === 'ok' ? 'Defensible' : 'Weak'}: `), ...inline(o.why));
    if (prior) btn.classList.add(o.verdict, ...(prior.picked === i ? ['picked'] : []));
    return {btn, why, node: el('div', {class: 'judge-opt'}, btn, why)};
  });
  return el('div', {}, el('div', {class: 'scenario'}, prose(j.scenario)), el('p', {class: 'muted'}, 'Pick what you would actually do. There is a best answer, but the reasons matter more.'),
    options.map(o => o.node));
}

function build() {
  const b = episode.build;
  const key = `${episode.id}:code`;
  const editor = el('textarea', {class: 'code', spellcheck: 'false', 'aria-label': 'Your Python code', autocapitalize: 'off', autocomplete: 'off'});
  editor.value = state.notes[key] ?? b.starter;
  let saveTimer;
  editor.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { state.notes[key] = editor.value; persist(); }, 400); });
  editor.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
  });
  const results = el('ul', {class: 'results'});
  const solution = el('details', {class: 'solution', hidden: !state.notes[`${episode.id}:ran`]},
    el('summary', {}, 'Reference solution (after your own attempt)'), el('pre', {}, el('code', {}, 'Loading…')));
  solution.addEventListener('toggle', async () => {
    if (!solution.open || solution.dataset.loaded) return;
    try {
      const res = await fetch(`./episodes/${episode.id}.solution.py`);
      solution.querySelector('code').textContent = res.ok ? await res.text() : 'No reference solution for this episode.';
      solution.dataset.loaded = '1';
    } catch { solution.querySelector('code').textContent = 'Could not load the reference solution.'; }
  });
  const hints = el('ol', {class: 'hints'});
  let shown = 0;
  const hintBtn = el('button', {type: 'button', onclick: () => {
    if (shown < b.hints.length) hints.append(el('li', {}, inline(b.hints[shown++])));
    if (shown >= b.hints.length) hintBtn.disabled = true;
  }}, 'Show a hint');
  const runBtn = el('button', {type: 'button', class: 'primary', onclick: async () => {
    runBtn.disabled = true;
    state.notes[key] = editor.value; state.notes[`${episode.id}:ran`] = true; persist();
    try {
      const out = await runPython(editor.value, b.tests, {onStatus: say});
      results.replaceChildren(
        ...(out.error ? [el('li', {class: 'fail'}, el('pre', {}, out.error))] : []),
        ...out.results.map(r => el('li', {class: r.ok ? 'pass' : 'fail'}, el('strong', {}, `${r.ok ? '✓' : '✗'} ${r.name}`), r.ok ? '' : el('pre', {}, r.error))),
        ...(out.stdout ? [el('li', {class: 'stdout'}, el('pre', {}, out.stdout))] : []));
      const passed = !out.error && out.results.length === b.tests.length && out.results.every(r => r.ok);
      solution.hidden = false;
      say(passed ? 'All tests pass.' : `${out.results.filter(r => r.ok).length}/${b.tests.length} tests pass.`);
      if (passed && !S.stageDone(state, episode.id, 'build')) finish('build', {});
    } catch (error) {
      results.replaceChildren(el('li', {class: 'fail'}, String(error.message || error)));
    } finally { runBtn.disabled = false; }
  }}, 'Run tests');
  return el('div', {}, el('h3', {}, b.title), prose(b.brief),
    el('p', {class: 'muted'}, 'Python runs in your browser. Write it yourself first; hints and the reference unlock as you go.'),
    editor, el('div', {class: 'row'}, runBtn, hintBtn,
      el('button', {type: 'button', onclick: () => { if (confirm('Replace your code with the starter?')) { editor.value = b.starter; state.notes[key] = b.starter; persist(); } }}, 'Reset to starter')),
    hints, results, solution);
}

function explain() {
  const x = episode.explain;
  const key = `${episode.id}:explain`;
  const area = el('textarea', {class: 'prose-input', rows: 6, 'aria-label': 'Your explanation'});
  area.value = state.notes[key] ?? '';
  const count = el('span', {class: 'muted'});
  const words = () => area.value.trim().split(/\s+/).filter(Boolean).length;
  const update = () => { count.textContent = `${words()} words${words() < 40 ? ' (40 to save)' : ''}`; saveBtn.disabled = words() < 40; };
  const saveBtn = el('button', {type: 'button', class: 'primary', onclick: () => {
    state.notes[key] = area.value; persist();
    if (!S.stageDone(state, episode.id, 'explain')) finish('explain', {words: words()}); else say('Saved.');
    askBtn.disabled = false;
  }}, 'Save my answer');
  area.addEventListener('input', () => { update(); state.notes[key] = area.value; persist(); });
  const model = el('select', {'aria-label': 'Coach model'}, MODELS.map(m => el('option', {value: m.id}, m.label)));
  const output = el('div', {class: 'coach-out', 'aria-live': 'polite'});
  const coachStatus = el('p', {class: 'muted'});
  let controller = null;
  const stopBtn = el('button', {type: 'button', hidden: true, onclick: () => controller?.abort()}, 'Stop');
  const askBtn = el('button', {type: 'button', disabled: !S.stageDone(state, episode.id, 'explain'), onclick: async () => {
    controller = new AbortController(); askBtn.disabled = true; stopBtn.hidden = false; output.textContent = '';
    try {
      await coach({model: model.value, prompt: x.prompt, focus: x.coachFocus, answer: area.value, signal: controller.signal,
        onStatus: t => { coachStatus.textContent = t; }, onToken: t => { output.textContent += t; }});
    } catch (error) {
      coachStatus.textContent = error.name === 'AbortError' || /abort/i.test(error.message) ? 'Stopped.' : `Coach unavailable: ${error.message}`;
    } finally { askBtn.disabled = false; stopBtn.hidden = true; controller = null; }
  }}, 'Ask the coach');
  update();
  return el('div', {}, el('p', {class: 'prompt'}, inline(x.prompt)), area, el('div', {class: 'row'}, saveBtn, count),
    el('div', {class: 'coach'}, el('h3', {}, 'Coach (optional, runs on your GPU)'),
      el('p', {class: 'muted'}, 'Unlocks after you save your own answer. A small local model reads it and asks the next question. It will not write the answer for you, and nothing leaves this device except the one-time model download.'),
      el('div', {class: 'row'}, model, askBtn, stopBtn), coachStatus, output));
}

function archive() {
  return el('section', {class: 'archive', 'aria-labelledby': 'archive-h'}, el('h2', {id: 'archive-h'}, 'Episodes'),
    el('ul', {}, [...index].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
      const done = state.episodes[e.id]?.doneOn;
      return el('li', {class: e.id === episode.id ? 'current' : ''},
        el('a', {href: `#/${e.id}`}, el('time', {datetime: e.date}, e.date), ' ', e.title),
        el('span', {class: 'muted'}, ` · ${(e.tracks || []).join(', ')}${done ? ' · finished' : ''}`));
    })));
}

function render({keepPlayer = false} = {}) {
  if (!keepPlayer) { player?.pause(); player = null; }
  const latest = S.pick(index, today());
  const isToday = latest && episode.id === latest.id;
  app.replaceChildren(
    stats(),
    reviewDeck(),
    el('section', {class: 'hero'},
      el('p', {class: 'kicker'}, `${isToday ? 'Today' : 'Episode'} · ${episode.date} · about ${episode.minutes} minutes`),
      el('h2', {class: 'ep-title'}, episode.title),
      el('p', {class: 'lede'}, inline(episode.hook)),
      el('ul', {class: 'chips'}, episode.tracks.map(t => el('li', {}, t))),
      latest && latest.date < today() && isToday ? el('p', {class: 'muted'}, 'Today’s new episode isn’t out yet. This is the latest one.') : null),
    stageCard('watch', 'Watch', 3, watch()),
    stageCard('read', 'Read', 6, read()),
    stageCard('prove', 'Prove it', 4, prove()),
    stageCard('judge', 'Judgment call', 3, judge()),
    stageCard('build', 'Build', 25, build()),
    stageCard('explain', 'Explain it', 5, explain()),
    archive(),
    el('section', {class: 'about'}, el('h2', {}, 'How this works'), prose(episode.disclosure)));
}

async function open(id) {
  episode = await getJSON(`./episodes/${id}.json`);
  document.title = `${episode.title} · Proof`;
  render();
  window.scrollTo({top: 0});
}

async function main() {
  try {
    index = (await getJSON('./episodes/index.json')).episodes;
    const wanted = location.hash.replace(/^#\//, '');
    const choice = index.find(e => e.id === wanted) || S.pick(index, today()) || index[0];
    if (!choice) { say('No episodes yet.'); return; }
    await open(choice.id);
    say('');
  } catch (error) {
    say(error.message);
  }
}

window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\//, '');
  if (index.some(e => e.id === id) && id !== episode?.id) open(id).catch(error => say(error.message));
});
main();
