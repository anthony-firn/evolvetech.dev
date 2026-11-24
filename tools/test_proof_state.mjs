// node --test tools/test_proof_state.mjs — game rules for /play/proof/.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../public/play/proof/state.js';

const finishAll = (state, id, day) => S.CORE.forEach(stage => S.complete(state, id, stage, day, stage === 'prove' ? {correct: 3, total: 4} : {}));

test('XP is awarded once per stage, quiz XP scales with correct answers', () => {
  const s = S.empty();
  assert.equal(S.complete(s, 'e1', 'prove', '2026-11-24', {correct: 3, total: 4}), 30);
  assert.equal(S.complete(s, 'e1', 'prove', '2026-11-24', {correct: 4, total: 4}), 0);
  assert.equal(S.complete(s, 'e1', 'build', '2026-11-24'), 40);
  assert.equal(s.xp, 70);
  assert.throws(() => S.complete(s, 'e1', 'nap', '2026-11-24'));
});

test('an episode counts as finished only when every core stage is done; judgment is a bonus', () => {
  const s = S.empty();
  S.CORE.slice(0, -1).forEach(stage => S.complete(s, 'e1', stage, '2026-11-24'));
  assert.equal(s.episodes.e1.doneOn, undefined);
  S.complete(s, 'e1', 'explain', '2026-11-24');
  assert.equal(s.episodes.e1.doneOn, '2026-11-24');
});

test('streaks run through today, survive until midnight, and break on a missed day', () => {
  const s = S.empty();
  finishAll(s, 'a', '2026-11-22');
  finishAll(s, 'b', '2026-11-23');
  assert.equal(S.streak(s, '2026-11-23'), 2);
  assert.equal(S.streak(s, '2026-11-24'), 2, 'yesterday still counts before today is done');
  finishAll(s, 'c', '2026-11-24');
  assert.equal(S.streak(s, '2026-11-24'), 3);
  assert.equal(S.streak(s, '2026-11-26'), 0, 'a missed day breaks it');
  assert.equal(S.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(S.addDays('2026-03-01', -1), '2026-02-28');
});

test('spaced review: right answers wait longer, misses come back tomorrow', () => {
  const s = S.empty();
  const card = {id: 'e1:q', q: 'Q', choices: ['a', 'b'], answer: 1, why: 'w'};
  S.schedule(s, card, true, '2026-11-24');
  assert.equal(s.cards['e1:q'].due, '2026-11-25');
  assert.equal(S.dueCards(s, '2026-11-24').length, 0);
  assert.equal(S.dueCards(s, '2026-11-25').length, 1);
  assert.equal(S.review(s, 'e1:q', true, '2026-11-25'), S.XP.review);
  assert.equal(s.cards['e1:q'].due, '2026-11-28');
  S.review(s, 'e1:q', true, '2026-11-28');
  assert.equal(s.cards['e1:q'].due, '2026-12-05');
  S.review(s, 'e1:q', false, '2026-12-05');
  assert.equal(s.cards['e1:q'].box, 0);
  assert.equal(s.cards['e1:q'].due, '2026-12-06');
});

test('today’s episode is the newest one not dated in the future', () => {
  const index = [{id: 'a', date: '2026-11-23'}, {id: 'b', date: '2026-11-24'}, {id: 'c', date: '2026-11-25'}];
  assert.equal(S.pick(index, '2026-11-24').id, 'b');
  assert.equal(S.pick(index, '2026-11-22'), null);
});

test('progress survives bad storage', () => {
  const broken = {getItem: () => '{not json', setItem: () => { throw new Error('full'); }};
  assert.deepEqual(S.load(broken), S.empty());
  assert.equal(S.save(broken, S.empty()), false);
});
