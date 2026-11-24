import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../public/play/proof/state.js';
const day = '2026-11-24';
const mission = id => ({id, briefing: {}, problem: {}, research: {}, design: {}, review: {}, build: {}, ship: {},
  recall: [{id: 'q', q: 'Question', choices: ['a','b'], answer: 1, why: 'Reason'}]});
const finishAll = (s, id, date) => { const m = mission(id); S.stagesOf(m).forEach(stage => S.complete(s, m, stage, date, {research: 5})); };

test('skill XP is credited once, rejects unknown or nonfinite awards without partial mutation', () => {
  const s = S.empty(), m = mission('a');
  assert.equal(S.complete(s, m, 'problem', day, {wisdom: 15, cost: 10}), 25);
  assert.equal(S.complete(s, m, 'problem', day, {wisdom: 99}), 0);
  assert.deepEqual(s.skills, {wisdom: 15, cost: 10});
  const before = structuredClone(s);
  assert.throws(() => S.complete(s, m, 'build', day, {craft: 10, invented: 10}));
  assert.throws(() => S.complete(s, m, 'build', day, {craft: Infinity}));
  assert.throws(() => S.complete(s, m, 'project', day, {apply: 50}));
  assert.deepEqual(s, before);
});

test('daily completion and recall do not depend on a weekly project', () => {
  const s = S.empty(), m = mission('a');
  S.stagesOf(m).slice(0, -1).forEach(stage => S.complete(s, m, stage, day));
  assert.equal(s.missions.a.doneOn, undefined);
  assert.equal(S.dueCards(s, S.addDays(day, 1)).length, 0);
  S.complete(s, m, 'ship', day, {communication: 12});
  assert.equal(s.missions.a.doneOn, day);
  assert.equal(s.cards['a:q'].due, '2026-11-25');
  const weekly = {id: 'weekly', project: {}};
  S.complete(s, weekly, 'project', day, {apply: 50});
  assert.equal(s.missions.weekly.doneOn, day);
  assert.equal(Object.keys(s.cards).length, 1);
});

test('review scoring penalizes false alarms and cannot produce negative XP', () => {
  const issues = [{real: true}, {real: true}, {real: false}];
  assert.deepEqual(S.reviewScore(issues, new Set([0,2])), {found: 1, wrong: 1, missed: 1, xp: 2});
  assert.equal(S.reviewScore(issues, new Set([2])).xp, 0);
});

test('recall advances after 1, 3, 7, 14, 30 days; early/repeated answers get no XP', () => {
  const s = S.empty(); finishAll(s, 'a', day);
  assert.equal(S.review(s, 'a:q', true, day), 0);
  assert.equal(S.review(s, 'a:q', true, '2026-11-25'), 5);
  assert.equal(s.cards['a:q'].due, '2026-11-28');
  assert.equal(S.review(s, 'a:q', true, '2026-11-25'), 0);
  S.review(s, 'a:q', true, '2026-11-28');
  assert.equal(s.cards['a:q'].due, '2026-12-05');
  S.review(s, 'a:q', true, '2026-12-05');
  assert.equal(s.cards['a:q'].due, '2026-12-19');
  S.review(s, 'a:q', true, '2026-12-19');
  assert.equal(s.cards['a:q'].due, '2027-01-18');
  S.review(s, 'a:q', false, '2027-01-18');
  assert.equal(s.cards['a:q'].due, '2027-01-19');
});

test('streak crosses month boundaries and breaks after a missed day', () => {
  const s = S.empty(); finishAll(s, 'a', '2026-11-30'); finishAll(s, 'b', '2026-12-01');
  assert.equal(S.streak(s, '2026-12-02'), 2);
  finishAll(s, 'c', '2026-12-02');
  assert.equal(S.streak(s, '2026-12-02'), 3);
  assert.equal(S.streak(s, '2026-12-04'), 0);
  assert.equal(S.addDays('2026-12-31', 1), '2027-01-01');
});

test('ship note requires a concise two-line account and a way to check it', () => {
  assert.equal(S.lintShipNote('Reserve the build slot.\nTest a short and a long backfill job.', 30).clean, true);
  for (const note of ['', 'Test one line.', 'Made it seamless.\nTest the code.', 'First.\nSecond.\nTest.'])
    assert.equal(S.lintShipNote(note, 30).clean, false);
  assert.equal(S.lintShipNote('Many many many many words.\nRun tests.', 3).clean, false);
});

test('newest dated daily can be selected independently of projects and future missions', () => {
  const index = [{id: 'a', date: '2026-11-23'}, {id: 'b', date: day}, {id: 'c', date: '2026-11-25'}];
  assert.equal(S.pick(index, day).id, 'b');
  assert.equal(S.pick(index, '2026-11-22'), null);
});

test('storage failures and v1 data preserve a usable v2 state', () => {
  const broken = {getItem: () => '{bad', setItem: () => { throw Error('full'); }};
  assert.deepEqual(S.load(broken), S.empty());
  assert.deepEqual(S.load({getItem: () => JSON.stringify({version: 1, xp: 200})}), S.empty());
  assert.deepEqual(S.load({getItem: () => JSON.stringify({version: 2, missions: null})}), S.empty());
  assert.equal(S.save(broken, S.empty()), false);
});
