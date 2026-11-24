// Game state: progress, XP per skill, streaks and spaced review. Pure functions, no DOM, so Node can test them.
// Everything lives in this browser's localStorage; nothing is sent anywhere.

export const KEY = 'proof-progress-v2';
// The daily mission follows one engineer's real loop: pick the problem, read how real systems solve it, design it
// yourself, review what an agent proposes, build the core by hand, then ship it in two lines.
export const STAGES = ['briefing', 'problem', 'research', 'design', 'review', 'build', 'ship', 'project'];
export const SKILLS = ['wisdom', 'cost', 'research', 'design', 'review', 'craft', 'communication', 'apply'];
export const SKILL_LABELS = {wisdom: 'Problem choice', cost: 'Cost sense', research: 'Research', design: 'Design', review: 'Review',
  craft: 'Craft', communication: 'Communication', apply: 'Applied'};
// Days until a recall question comes back, by Leitner box. A miss sends it back to box 0.
export const BOXES = [1, 3, 7, 14, 30];
export const REVIEW_XP = 5;

export const empty = () => ({version: 2, missions: {}, cards: {}, xp: 0, skills: {}, notes: {}});

export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    return s?.version === 2 ? {...empty(), ...s} : empty();
  } catch {
    return empty();
  }
}

export function save(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

// The stages a mission actually has, in play order.
export const stagesOf = mission => STAGES.filter(s => mission[s]);

// Records a finished stage once and credits XP to skills, e.g. {wisdom: 15, cost: 10}. Returns the XP gained.
export function complete(state, mission, stage, today, earned = {}, detail = {}) {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage ${stage}`);
  const m = state.missions[mission.id] ||= {stages: {}};
  if (m.stages[stage]) return 0;
  let gained = 0;
  for (const [skill, xp] of Object.entries(earned)) {
    if (!SKILLS.includes(skill)) throw new Error(`Unknown skill ${skill}`);
    const n = Math.max(0, Math.round(xp));
    state.skills[skill] = (state.skills[skill] || 0) + n;
    gained += n;
  }
  m.stages[stage] = {on: today, xp: gained, ...detail};
  state.xp += gained;
  if (!m.doneOn && stagesOf(mission).every(s => m.stages[s])) {
    m.doneOn = today;
    // Recall questions start coming back tomorrow, never the same day you learned them.
    for (const q of mission.recall || []) {
      const id = `${mission.id}:${q.id}`;
      state.cards[id] ||= {id, mission: mission.id, q: q.q, choices: q.choices, answer: q.answer, why: q.why, box: -1, due: addDays(today, 1), seen: 0};
    }
  }
  return gained;
}

export const stageDone = (state, missionId, stage) => Boolean(state.missions[missionId]?.stages[stage]);

// Consecutive days with a finished mission, ending today, or yesterday if today isn't finished yet.
export function streak(state, today) {
  const days = new Set(Object.values(state.missions).map(m => m.doneOn).filter(Boolean));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) { n++; day = addDays(day, -1); }
  return n;
}

export const level = xp => 1 + Math.floor(Math.sqrt(xp / 50));

export function dueCards(state, today, limit = 6) {
  return Object.values(state.cards).filter(c => c.due <= today).sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box).slice(0, limit);
}

export function review(state, cardId, correct, today) {
  const card = state.cards[cardId];
  if (!card) return 0;
  const box = correct ? Math.min(card.box + 1, BOXES.length - 1) : 0;
  state.cards[cardId] = {...card, box, due: addDays(today, BOXES[box]), seen: card.seen + 1};
  if (!correct) return 0;
  state.xp += REVIEW_XP;
  state.skills.research = (state.skills.research || 0) + REVIEW_XP;
  return REVIEW_XP;
}

// Scores a review: credit for each real flaw found, a penalty for flagging something that's fine.
export function reviewScore(issues, flagged) {
  let found = 0, wrong = 0;
  issues.forEach((issue, i) => {
    if (!flagged.has(i)) return;
    if (issue.real) found++; else wrong++;
  });
  const real = issues.filter(i => i.real).length;
  return {found, wrong, missed: real - found, xp: Math.max(0, found * 6 - wrong * 4)};
}

// Today's mission is the newest one dated on or before today.
export function pick(index, today) {
  return [...index].filter(e => e.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

// Two lines and a way to verify: flags what makes a ship note slow to read.
const STOCK = /\b(delve|leverag\w*|seamless\w*|robust|game[- ]changer|cutting[- ]edge|streamlin\w*|holistic|empower\w*|synerg\w*|in today's|this pr (?:aims|seeks) to)\b/gi;
export function lintShipNote(text, wordLimit) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const problems = [];
  if (!words) problems.push('Empty.');
  if (words > wordLimit) problems.push(`${words} words; the limit is ${wordLimit}.`);
  const stock = [...new Set((text.match(STOCK) || []).map(s => s.toLowerCase()))];
  if (stock.length) problems.push(`Stock phrases: ${stock.join(', ')}.`);
  if (!/verif|test|run|check|repro|try/i.test(text)) problems.push('Say how a reviewer can verify it.');
  if ((text.match(/—/g) || []).length > 1) problems.push('More than one em dash.');
  return {words, problems, clean: problems.length === 0};
}
