// Game state: progress, XP, streaks and spaced review. Pure functions, no DOM, so Node can test them.
// Everything lives in this browser's localStorage; nothing is sent anywhere.

export const KEY = 'proof-progress-v1';
export const STAGES = ['watch', 'read', 'prove', 'judge', 'build', 'explain'];
export const CORE = ['watch', 'read', 'prove', 'build', 'explain'];
export const XP = {watch: 10, read: 10, prove: 10, judge: 15, build: 40, explain: 15, review: 5};
// Days until a question comes back, by Leitner box. A miss sends it back to box 0.
export const BOXES = [1, 3, 7, 14, 30];

export const empty = () => ({version: 1, episodes: {}, cards: {}, xp: 0, notes: {}});

export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    return s?.version === 1 ? {...empty(), ...s} : empty();
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

// Marks a stage done. XP is awarded once per stage per episode; prove XP scales with correct answers.
export function complete(state, episodeId, stage, today, detail = {}) {
  if (!STAGES.includes(stage)) throw new Error(`Unknown stage ${stage}`);
  const ep = state.episodes[episodeId] ||= {stages: {}};
  if (ep.stages[stage]) return 0;
  ep.stages[stage] = {on: today, ...detail};
  const gained = stage === 'prove' ? XP.prove * (detail.correct ?? 0) : XP[stage];
  state.xp += gained;
  if (!ep.doneOn && CORE.every(s => ep.stages[s])) ep.doneOn = today;
  return gained;
}

export function stageDone(state, episodeId, stage) {
  return Boolean(state.episodes[episodeId]?.stages[stage]);
}

// Consecutive days with a finished episode, ending today, or yesterday if today isn't finished yet.
export function streak(state, today) {
  const days = new Set(Object.values(state.episodes).map(e => e.doneOn).filter(Boolean));
  let day = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(day)) { n++; day = addDays(day, -1); }
  return n;
}

export const level = xp => 1 + Math.floor(Math.sqrt(xp / 50));

// Spaced review: each answered question becomes a card with a snapshot, so old episodes needn't be fetched.
export function schedule(state, card, correct, today) {
  const prev = state.cards[card.id];
  const box = correct ? Math.min((prev?.box ?? -1) + 1, BOXES.length - 1) : 0;
  state.cards[card.id] = {...card, box, due: addDays(today, BOXES[box]), seen: (prev?.seen ?? 0) + 1};
}

export function dueCards(state, today, limit = 5) {
  return Object.values(state.cards).filter(c => c.due <= today).sort((a, b) => a.due.localeCompare(b.due) || a.box - b.box).slice(0, limit);
}

export function review(state, cardId, correct, today) {
  const card = state.cards[cardId];
  if (!card) return 0;
  schedule(state, card, correct, today);
  state.xp += correct ? XP.review : 0;
  return correct ? XP.review : 0;
}

// XP per track, from finished stages of episodes whose tracks are known.
export function skills(state, index) {
  const tracks = {};
  for (const meta of index) {
    const ep = state.episodes[meta.id];
    if (!ep) continue;
    const earned = Object.entries(ep.stages).reduce((sum, [s, d]) => sum + (s === 'prove' ? XP.prove * (d.correct ?? 0) : XP[s]), 0);
    for (const t of meta.tracks || []) tracks[t] = (tracks[t] || 0) + earned;
  }
  return tracks;
}

// Today's episode is the newest one dated on or before today.
export function pick(index, today) {
  return [...index].filter(e => e.date <= today).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
