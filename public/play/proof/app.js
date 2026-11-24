import {el, inline, prose} from './text.js';
import * as S from './state.js';
import {createPlayer} from './player.js';
import {runPython} from './runner.js';
import {coach, MODELS} from './coach.js';

let store;
try { store = window.localStorage; } catch { store = {getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); }}; }
const app = document.querySelector('#app');
const status = document.querySelector('#status');
let state = S.load(store);
let index = [];
let demand = null;
let mission = null;
let player = null;
const today = () => S.localDate();
const words = text => text.trim().split(/\s+/).filter(Boolean).length;
const note = key => state.notes[`${mission.id}:${key}`];
const setNote = (key, value) => { state.notes[`${mission.id}:${key}`] = value; persist(); };

function persist() { if (!S.save(store, state)) say('Progress could not be saved in this browser (private mode or full storage).'); }
function say(text) { status.textContent = text; }
async function getJSON(url) {
  const res = await fetch(url, {cache: 'no-cache'});
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  return res.json();
}

// Marks a stage done in place, so answers and results stay on screen.
function finish(stage, earned, detail) {
  const gained = S.complete(state, mission, stage, today(), earned, detail);
  persist();
  const card = document.getElementById(`stage-${stage}`);
  if (card) {
    card.classList.add('done');
    card.querySelector('.meta').textContent = `Done · +${gained} XP`;
    card.querySelectorAll('[data-hide-when-done]').forEach(n => n.remove());
  }
  const stages = S.stagesOf(mission);
  const next = stages[stages.indexOf(stage) + 1];
  if (next) {
    const nextCard = document.getElementById(`stage-${next}`);
    nextCard?.querySelector('.stage-body')?.removeAttribute('hidden');
    nextCard?.querySelector('.locked-note')?.remove();
  }
  document.querySelector('.stats')?.replaceWith(stats());
  const finished = state.missions[mission.id]?.doneOn === today();
  say(finished && gained ? `+${gained} XP. Mission complete. Streak: ${S.streak(state, today())} days.${mission.recall?.length ? ' Recall starts tomorrow.' : ''}` : gained ? `+${gained} XP` : '');
  return gained;
}

function stats() {
  const n = S.streak(state, today());
  const lvl = S.level(state.xp);
  const next = 50 * lvl * lvl, prev = 50 * (lvl - 1) * (lvl - 1);
  const top = Math.max(60, ...S.SKILLS.map(s => state.skills[s] || 0));
  return el('section', {class: 'stats', 'aria-label': 'Your progress'},
    el('div', {class: 'stat'}, el('b', {}, String(n)), el('span', {}, 'day streak')),
    el('div', {class: 'stat'}, el('b', {}, `Level ${lvl}`), el('span', {}, `${state.xp} XP`),
      el('progress', {max: next - prev, value: state.xp - prev, 'aria-label': 'Progress to next level'})),
    el('div', {class: 'skills'}, S.SKILLS.map(s =>
      el('div', {class: 'skill'}, el('span', {}, S.SKILL_LABELS[s]), el('meter', {min: 0, max: top, value: state.skills[s] || 0}), el('small', {}, String(state.skills[s] || 0))))));
}

function reviewDeck() {
  const due = S.dueCards(state, today());
  if (!due.length) return el('section', {class: 'review-deck quiet'}, el('p', {}, 'No recall due. Each finished mission adds questions that come back after 1, 3, 7, 14 and 30 days, sooner if you miss them.'));
  return el('section', {class: 'review-deck', 'aria-labelledby': 'recall-h'},
    el('h2', {id: 'recall-h'}, `Recall · ${due.length} due`),
    el('p', {class: 'muted'}, 'From memory, before today’s mission.'),
    due.map(card => {
      const out = el('p', {class: 'why', hidden: true});
      const buttons = card.choices.map((choice, i) => el('button', {type: 'button', class: 'choice', onclick: () => {
        const right = i === card.answer;
        buttons.forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === card.answer); b.classList.toggle('wrong', j === i && !right); });
        const gained = S.review(state, card.id, right, today()); persist();
        out.hidden = false; out.replaceChildren(el('strong', {}, right ? `Right. +${gained} XP. ` : 'Not quite. '), ...inline(card.why));
        document.querySelector('.stats')?.replaceWith(stats());
      }}, inline(choice)));
      return el('div', {class: 'card'}, el('p', {class: 'q'}, inline(card.q)), el('div', {class: 'choices'}, buttons), out);
    }));
}

const TITLES = {briefing: 'Briefing', problem: 'Pick the problem', research: 'Read the source', design: 'Design it yourself',
  review: 'Review the agent', build: 'Build the core by hand', ship: 'Ship note', project: 'Apply it to your work'};
const MINUTES = {briefing: 3, problem: 3, research: 15, design: 10, review: 7, build: 20, ship: 2, project: 120};

function stageCard(stage, n, body) {
  const done = state.missions[mission.id]?.stages[stage];
  const locked = n > 1 && !S.stageDone(state, mission.id, S.stagesOf(mission)[n - 2]);
  return el('section', {class: `stage-card${done ? ' done' : ''}`, id: `stage-${stage}`, 'aria-labelledby': `h-${stage}`},
    el('header', {}, el('span', {class: 'step'}, String(n)), el('h2', {id: `h-${stage}`}, TITLES[stage]),
      el('span', {class: 'meta'}, done ? `Done · +${done.xp} XP` : `${MINUTES[stage]} min`)),
    locked ? el('p', {class: 'locked-note muted'}, 'Finish the previous stage to continue.') : null,
    el('div', {class: 'stage-body', hidden: locked}, body));
}

function briefing() {
  if (!player) player = createPlayer(mission.briefing.scenes, {onFinish: () => finish('briefing', {research: 5})});
  const video = mission.briefing.video;
  const recorded = video ? el('video', {controls: true, preload: 'metadata', poster: video.poster, 'aria-label': 'Daily briefing video', onended: () => finish('briefing', {research: 5})},
    el('source', {src: video.src, type: 'video/mp4'}),
    el('track', {kind: 'captions', src: video.captions, srclang: 'en', label: 'English'})) : null;
  return el('div', {}, recorded,
    video ? el('details', {}, el('summary', {}, 'Interactive scenes and browser narration'), player.root) : player.root,
    el('details', {}, el('summary', {}, 'Read the script instead'), mission.briefing.scenes.map(s => el('p', {}, el('strong', {}, `${s.title}. `), ...inline(s.narration)))),
    S.stageDone(state, mission.id, 'briefing') ? null : el('button', {type: 'button', 'data-hide-when-done': true, onclick: () => finish('briefing', {research: 5})}, 'Mark as watched'));
}

// One multiple-choice block whose result is revealed once picked.
function choiceBlock({question, options, verdictOf, labelOf, priorIndex, onPick}) {
  const whys = options.map(() => el('p', {class: 'why', hidden: priorIndex === undefined}));
  const buttons = options.map((o, i) => el('button', {type: 'button', class: 'choice', disabled: priorIndex !== undefined, onclick: () => {
    buttons.forEach((b, k) => { b.disabled = true; b.classList.add(verdictOf(k)); whys[k].hidden = false; });
    buttons[i].classList.add('picked');
    onPick(i);
  }}, inline(o.text ?? o)));
  options.forEach((o, i) => {
    whys[i].replaceChildren(el('strong', {}, `${labelOf(i)}: `), ...inline(o.why ?? ''));
    if (priorIndex !== undefined) buttons[i].classList.add(verdictOf(i), ...(priorIndex === i ? ['picked'] : []));
  });
  return el('div', {}, question ? el('p', {class: 'prompt'}, inline(question)) : null, options.map((o, i) => el('div', {class: 'judge-opt'}, buttons[i], whys[i])));
}

function problem() {
  const p = mission.problem;
  const prior = state.missions[mission.id]?.stages.problem;
  const picks = {...(prior || {})};
  const VERDICT = {best: 'Strongest', ok: 'Defensible', poor: 'Weak'};
  const XP = {best: 15, ok: 8, poor: 3};
  const tryFinish = () => {
    if (picks.option === undefined || picks.cost === undefined || prior) return;
    finish('problem', {wisdom: XP[p.options[picks.option].verdict], cost: picks.cost === p.cost.answer ? 10 : 2}, {option: picks.option, cost: picks.cost});
  };
  return el('div', {},
    el('div', {class: 'scenario'}, prose(p.context)),
    el('p', {class: 'muted'}, 'Intellect solves the problem; wisdom picks which one. Choose before you read anything else.'),
    choiceBlock({question: p.question, options: p.options, priorIndex: prior?.option, verdictOf: i => p.options[i].verdict,
      labelOf: i => VERDICT[p.options[i].verdict], onPick: i => { picks.option = i; tryFinish(); }}),
    el('h3', {}, 'Cost sense'),
    choiceBlock({question: p.cost.q, options: p.cost.choices.map((c, i) => ({text: c, why: i === p.cost.answer ? p.cost.why : ''})), priorIndex: prior?.cost,
      verdictOf: i => (i === p.cost.answer ? 'best' : 'poor'), labelOf: i => (i === p.cost.answer ? 'Right' : 'No'),
      onPick: i => { picks.cost = i; tryFinish(); }}));
}

// A self-checked list: tick what your own answer actually covered.
function checklist(items, prior, onScore, label) {
  const boxes = items.map((t, i) => el('label', {class: 'opt'}, el('input', {type: 'checkbox', checked: Boolean(prior?.hit?.includes(i)), disabled: Boolean(prior)}), el('span', {}, inline(t))));
  const btn = el('button', {type: 'button', class: 'primary', disabled: Boolean(prior), 'data-hide-when-done': true, onclick: () => {
    const hit = boxes.map((b, i) => (b.querySelector('input').checked ? i : -1)).filter(i => i >= 0);
    boxes.forEach(b => { b.querySelector('input').disabled = true; });
    onScore(hit);
  }}, label);
  return el('div', {class: 'checklist'}, el('p', {class: 'muted'}, 'Be honest: tick only what your answer actually said.'), boxes, prior ? null : btn);
}

function research() {
  const r = mission.research;
  const prior = state.missions[mission.id]?.stages.research;
  const reveal = el('div', {class: 'reveal', hidden: !prior && !note('research-submitted')});
  const areas = r.questions.map(q => {
    const a = el('textarea', {class: 'prose-input', rows: 4, 'aria-label': q.q});
    a.value = note(`research:${q.id}`) ?? '';
    a.readOnly = Boolean(prior || note('research-submitted'));
    a.addEventListener('input', () => setNote(`research:${q.id}`, a.value));
    return a;
  });
  const fill = () => reveal.replaceChildren(
    el('h3', {}, 'Reference answers'),
    r.questions.map(q => el('div', {class: 'ref'}, el('p', {class: 'q'}, inline(q.q)), prose(q.answer))),
    el('h3', {}, 'Key points'),
    checklist(r.questions.flatMap(q => q.points), prior, hit => finish('research', {research: 5 * hit.length}, {hit}), 'Score my reading'));
  if (!reveal.hidden) fill();
  const submit = el('button', {type: 'button', class: 'primary', hidden: !reveal.hidden, onclick: () => {
    const short = r.questions.filter((q, i) => words(areas[i].value) < 12);
    if (short.length) { say(`Answer every question from the source in your own words (12+ words each). ${short.length} to go.`); return; }
    areas.forEach(a => { a.readOnly = true; });
    setNote('research-submitted', true); submit.hidden = true; reveal.hidden = false; fill();
  }}, 'Lock in my answers');
  return el('div', {class: 'reading'},
    el('p', {class: 'muted'}, 'Open the source and read the named sections. Submit your own answers before seeing the references.'),
    el('ul', {class: 'sources primary'}, r.sources.map(s => el('li', {},
      el('a', {href: s.url, target: '_blank', rel: 'noopener noreferrer'}, s.title), ` · ${s.note}${s.minutes ? ` · about ${s.minutes} min` : ''}`))),
    el('h3', {}, 'What to look for'), prose(r.guide),
    r.questions.map((q, i) => el('div', {class: 'qa'}, el('p', {class: 'q'}, `${i + 1}. `, ...inline(q.q)), areas[i])),
    submit, reveal);
}

function coachPanel(task, prompt, focus, getAnswer, unlocked) {
  const model = el('select', {'aria-label': 'Coach model'}, MODELS.map(m => el('option', {value: m.id}, m.label)));
  const output = el('div', {class: 'coach-out', 'aria-live': 'polite'});
  const line = el('p', {class: 'muted'});
  let controller = null;
  const stop = el('button', {type: 'button', hidden: true, onclick: () => controller?.abort()}, 'Stop');
  const ask = el('button', {type: 'button', disabled: !unlocked, onclick: async () => {
    controller = new AbortController(); ask.disabled = true; stop.hidden = false; output.textContent = '';
    try {
      await coach({task, model: model.value, prompt, focus, answer: getAnswer(), signal: controller.signal,
        onStatus: t => { line.textContent = t; }, onToken: t => { output.textContent += t; }});
    } catch (error) {
      line.textContent = /abort/i.test(`${error.name} ${error.message}`) ? 'Stopped.' : `Coach unavailable: ${error.message}`;
    } finally { ask.disabled = false; stop.hidden = true; controller = null; }
  }}, 'Ask the coach');
  return {node: el('div', {class: 'coach'}, el('h3', {}, 'Coach (optional, on your GPU)'),
    el('p', {class: 'muted'}, 'Unlocks after you submit. A small local model reviews it bluntly and asks the next question. It won’t write it for you.'),
    el('div', {class: 'row'}, model, ask, stop), line, output), unlock: () => { ask.disabled = false; }};
}

function design() {
  const d = mission.design;
  const prior = state.missions[mission.id]?.stages.design;
  const submitted = Boolean(prior || note('design-submitted'));
  const areas = d.fields.map(f => {
    const a = el('textarea', {class: 'prose-input', rows: 3, 'aria-label': f.label, placeholder: f.hint || ''});
    a.value = note(`design:${f.id}`) ?? '';
    a.readOnly = submitted;
    a.addEventListener('input', () => { setNote(`design:${f.id}`, a.value); count(); });
    return a;
  });
  const counter = el('span', {class: 'muted'});
  const total = () => areas.reduce((n, a) => n + words(a.value), 0);
  const count = () => { counter.textContent = `${total()} / ${d.wordLimit} words`; counter.classList.toggle('over', total() > d.wordLimit); };
  const answer = () => d.fields.map((f, i) => `${f.label}: ${areas[i].value}`).join('\n');
  const panel = coachPanel('design', d.prompt, d.coachFocus, answer, submitted);
  const reveal = el('div', {class: 'reveal', hidden: !submitted});
  const fill = () => reveal.replaceChildren(el('h3', {}, 'A reference design'), prose(d.reference), el('h3', {}, 'Rubric'),
    checklist(d.rubric, prior, hit => finish('design', {design: 10 + 5 * hit.length}, {hit}), 'Score my design'));
  if (submitted) fill();
  const submit = el('button', {type: 'button', class: 'primary', hidden: submitted, onclick: () => {
    if (areas.some(a => !a.value.trim())) { say('Fill in every part before submitting.'); return; }
    if (total() > d.wordLimit) { say(`Cut it to ${d.wordLimit} words. Short designs are reviewed; long ones are skimmed.`); return; }
    areas.forEach(a => { a.readOnly = true; });
    setNote('design-submitted', true); submit.hidden = true; reveal.hidden = false; fill(); panel.unlock();
  }}, 'Submit my design');
  count();
  return el('div', {}, el('p', {class: 'prompt'}, inline(d.prompt)), el('p', {class: 'muted'}, 'Your own thinking first: no AI until you submit.'),
    d.fields.map((f, i) => el('label', {class: 'field'}, el('span', {}, f.label), areas[i])), el('div', {class: 'row'}, submit, counter), reveal, panel.node);
}

function reviewStage() {
  const r = mission.review;
  const prior = state.missions[mission.id]?.stages.review;
  const boxes = r.issues.map((issue, i) => el('label', {class: 'opt issue'},
    el('input', {type: 'checkbox', checked: Boolean(prior?.flagged?.includes(i)), disabled: Boolean(prior)}), el('span', {}, inline(issue.text))));
  const results = el('div', {class: 'results-list'});
  const show = flagged => {
    const score = S.reviewScore(r.issues, flagged);
    r.issues.forEach((issue, i) => {
      const mark = issue.real ? (flagged.has(i) ? 'caught' : 'missed') : (flagged.has(i) ? 'false alarm' : 'fine');
      boxes[i].classList.add(issue.real ? 'real' : 'not-real');
      boxes[i].append(el('span', {class: `verdict ${mark.replace(' ', '-')}`}, ` ${mark}. `), el('span', {class: 'why'}, ...inline(issue.why)));
    });
    results.replaceChildren(el('p', {class: 'score'}, `Caught ${score.found}, missed ${score.missed}, false alarms ${score.wrong}.`));
    return score;
  };
  if (prior) show(new Set(prior.flagged));
  const submit = el('button', {type: 'button', class: 'primary', hidden: Boolean(prior), onclick: () => {
    const flagged = new Set(boxes.map((b, i) => (b.querySelector('input').checked ? i : -1)).filter(i => i >= 0));
    boxes.forEach(b => { b.querySelector('input').disabled = true; });
    submit.hidden = true;
    const score = show(flagged);
    finish('review', {review: score.xp}, {flagged: [...flagged]});
  }}, 'Submit my review');
  const artifact = r.artifact.format === 'code' ? el('pre', {class: 'artifact'}, el('code', {}, r.artifact.body)) : el('div', {class: 'artifact'}, prose(r.artifact.body));
  return el('div', {}, prose(r.intro), el('h3', {}, r.artifact.title), artifact,
    el('p', {class: 'prompt'}, 'Tick every statement that is a real problem with this design. Flagging something that’s fine costs points.'),
    boxes, submit, results);
}

function build() {
  const b = mission.build;
  const editor = el('textarea', {class: 'code', spellcheck: 'false', 'aria-label': 'Your Python code', autocapitalize: 'off', autocomplete: 'off'});
  editor.value = note('code') ?? b.starter;
  let timer;
  editor.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => setNote('code', editor.value), 400); });
  editor.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
  });
  const results = el('ul', {class: 'results'});
  const solution = el('details', {class: 'solution', hidden: !note('ran')}, el('summary', {}, 'Reference solution (after your own attempt)'), el('pre', {}, el('code', {}, 'Loading…')));
  solution.addEventListener('toggle', async () => {
    if (!solution.open || solution.dataset.loaded) return;
    try {
      const res = await fetch(`./episodes/${mission.id}.solution.py`);
      solution.querySelector('code').textContent = res.ok ? await res.text() : 'No reference solution for this mission.';
      solution.dataset.loaded = '1';
    } catch { solution.querySelector('code').textContent = 'Could not load the reference solution.'; }
  });
  const hints = el('ol', {class: 'hints'});
  let shown = note('hints') || 0;
  b.hints.slice(0, shown).forEach(h => hints.append(el('li', {}, inline(h))));
  const hintBtn = el('button', {type: 'button', onclick: () => {
    if (shown < b.hints.length) { hints.append(el('li', {}, inline(b.hints[shown++]))); setNote('hints', shown); }
    if (shown >= b.hints.length) hintBtn.disabled = true;
  }}, 'Show a hint');
  hintBtn.disabled = shown >= b.hints.length;
  const run = el('button', {type: 'button', class: 'primary', onclick: async () => {
    run.disabled = true;
    setNote('code', editor.value); setNote('ran', true);
    try {
      const out = await runPython(editor.value, b.tests, {onStatus: say});
      results.replaceChildren(
        ...(out.error ? [el('li', {class: 'fail'}, el('pre', {}, out.error))] : []),
        ...out.results.map(r => el('li', {class: r.ok ? 'pass' : 'fail'}, el('strong', {}, `${r.ok ? '✓' : '✗'} ${r.name}`), r.ok ? '' : el('pre', {}, r.error), r.stdout ? el('pre', {class: 'stdout'}, r.stdout) : '')),
        ...(out.stdout ? [el('li', {class: 'stdout'}, el('pre', {}, out.stdout))] : []));
      const passed = !out.error && out.results.length === b.tests.length && out.results.every(r => r.ok);
      solution.hidden = false;
      say(passed ? 'All tests pass.' : `${out.results.filter(r => r.ok).length}/${b.tests.length} tests pass.`);
      if (passed && !S.stageDone(state, mission.id, 'build')) finish('build', {craft: 40 - 5 * Math.min(shown, 3)}, {hints: shown});
    } catch (error) {
      results.replaceChildren(el('li', {class: 'fail'}, String(error.message || error)));
    } finally { run.disabled = false; }
  }}, 'Run tests');
  return el('div', {}, el('h3', {}, b.title), prose(b.brief),
    el('p', {class: 'muted'}, 'By hand, no AI: this is live-coding practice. Python runs in your browser. Each hint costs 5 XP.'),
    editor, el('div', {class: 'row'}, run, hintBtn,
      el('button', {type: 'button', onclick: () => { if (confirm('Replace your code with the starter?')) { editor.value = b.starter; setNote('code', b.starter); } }}, 'Reset to starter')),
    hints, results, solution);
}

function ship() {
  const s = mission.ship;
  const prior = state.missions[mission.id]?.stages.ship;
  const area = el('textarea', {class: 'prose-input', rows: 4, 'aria-label': 'Your ship note'});
  area.value = note('ship') ?? '';
  const lint = el('ul', {class: 'lint'});
  const counter = el('span', {class: 'muted'});
  const check = () => {
    const r = S.lintShipNote(area.value, s.wordLimit);
    counter.textContent = `${r.words} / ${s.wordLimit} words`;
    lint.replaceChildren(...r.problems.map(p => el('li', {}, p)));
    return r;
  };
  area.addEventListener('input', () => { setNote('ship', area.value); check(); });
  const panel = coachPanel('ship', s.prompt, s.coachFocus, () => area.value, Boolean(prior));
  const example = el('details', {class: 'example', open: Boolean(prior), hidden: !prior}, el('summary', {}, 'One way to write it'), prose(s.example));
  const submit = el('button', {type: 'button', class: 'primary', 'data-hide-when-done': true, onclick: () => {
    const r = check();
    if (!r.clean) { say('Revise the note using the feedback before shipping.'); return; }
    finish('ship', {communication: r.clean ? 12 : 5}, {clean: r.clean});
    area.readOnly = true; example.hidden = false; example.open = true; panel.unlock();
  }}, prior ? 'Shipped' : 'Ship it');
  area.readOnly = Boolean(prior);
  if (prior) submit.disabled = true;
  check();
  return el('div', {}, el('p', {class: 'prompt'}, inline(s.prompt)),
    el('p', {class: 'muted'}, 'Two lines on what changed and why, then how a reviewer can verify it. No walls of text.'),
    area, el('div', {class: 'row'}, submit, counter), lint, example, panel.node);
}

function project() {
  const p = mission.project;
  const prior = state.missions[mission.id]?.stages.project;
  const link = el('input', {type: 'url', class: 'link-input', placeholder: 'https://github.com/… (your pull request or commit)', 'aria-label': 'Link to your work'});
  link.value = note('project-link') ?? '';
  link.addEventListener('input', () => setNote('project-link', link.value));
  const done = el('button', {type: 'button', class: 'primary', 'data-hide-when-done': true, onclick: () => {
    if (!/^https:\/\/\S+$/.test(link.value.trim())) { say('Paste an https link to the pull request or commit.'); return; }
    finish('project', {apply: 50}, {link: link.value.trim()});
  }}, 'Mark it shipped');
  return el('div', {}, prose(p.brief), el('h3', {}, 'Deliverable'), prose(p.deliverable),
    p.suggestions?.length ? el('ul', {}, p.suggestions.map(x => el('li', {}, inline(x)))) : null,
    prior ? el('p', {class: 'score'}, 'Shipped: ', el('a', {href: prior.link, target: '_blank', rel: 'noopener noreferrer'}, prior.link)) : el('div', {class: 'row'}, link, done));
}

const RENDER = {briefing, problem, research, design, review: reviewStage, build, ship, project};

function demandPanel() {
  if (!demand?.skills?.length) return null;
  return el('details', {class: 'demand'}, el('summary', {}, `Skills in the selected job postings (${demand.listings} postings, ${demand.asOf})`),
    el('p', {class: 'muted'}, inline(demand.basis)),
    el('ul', {}, demand.skills.slice(0, 12).map(s => el('li', {}, el('span', {}, s.skill), el('meter', {min: 0, max: 1, value: s.share}), el('small', {}, `${Math.round(100 * s.share)}%`)))));
}

function archive() {
  return el('section', {class: 'archive', 'aria-labelledby': 'archive-h'}, el('h2', {id: 'archive-h'}, 'Missions'),
    el('ul', {}, [...index].sort((a, b) => b.date.localeCompare(a.date)).map(e => el('li', {class: e.id === mission.id ? 'current' : ''},
      el('a', {href: `#/${e.id}`}, el('time', {datetime: e.date}, e.date), ' ', e.title),
      el('span', {class: 'muted'}, ` · ${e.kind === 'project' ? 'weekly project · ' : ''}${(e.tracks || []).join(', ')}${state.missions[e.id]?.doneOn ? ' · finished' : ''}`)))));
}

function render() {
  player?.pause(); player = null;
  const latest = S.pick(index.filter(e => e.kind !== 'project'), today());
  const isToday = latest && mission.id === latest.id;
  const stages = S.stagesOf(mission);
  app.replaceChildren(
    stats(),
    reviewDeck(),
    el('section', {class: 'hero'},
      el('p', {class: 'kicker'}, `${isToday ? 'Today' : 'Mission'} · ${mission.date} · about ${mission.minutes} minutes${mission.kind === 'project' ? ' · weekly project' : ''}`),
      el('h2', {class: 'ep-title'}, mission.title),
      el('p', {class: 'lede'}, inline(mission.hook)),
      el('ul', {class: 'chips'}, mission.tracks.map(t => el('li', {}, t))),
      isToday && latest.date < today() ? el('p', {class: 'muted'}, 'Today’s mission isn’t out yet. This is the latest one.') : null,
      demandPanel()),
    ...stages.map((s, i) => stageCard(s, i + 1, RENDER[s]())),
    el('section', {class: 'about'}, el('h2', {}, 'Reading list'), el('ul', {class: 'sources'}, mission.sources.map(s => el('li', {},
      el('a', {href: s.url, target: '_blank', rel: 'noopener noreferrer'}, s.title), s.note ? ` · ${s.note}` : '')))),
    archive(),
    el('section', {class: 'about'}, el('h2', {}, 'How this works'), prose(mission.disclosure)));
}

let openRequest = 0;
async function open(id) {
  const request = ++openRequest;
  const loaded = await getJSON(`./episodes/${encodeURIComponent(id)}.json`);
  if (request !== openRequest) return;
  mission = loaded;
  document.title = `${mission.title} · Proof`;
  render();
  window.scrollTo({top: 0});
}

async function main() {
  try {
    index = (await getJSON('./episodes/index.json')).episodes;
    demand = await getJSON('./demand.json').catch(() => null);
    const wanted = location.hash.replace(/^#\//, '');
    const choice = index.find(e => e.id === wanted) || S.pick(index.filter(e => e.kind !== 'project'), today()) || index[0];
    if (!choice) { say('No missions yet.'); return; }
    await open(choice.id);
    say('');
  } catch (error) {
    say(error.message);
  }
}

window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\//, '');
  if (index.some(e => e.id === id) && id !== mission?.id) open(id).catch(error => say(error.message));
});
main();
