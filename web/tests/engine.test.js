import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCandidate } from '../src/engine.js';
test('weakened moves come from evaluated candidates and avoid catastrophic score gaps', () => {
  const candidates = [{ move: 'e7e5', score: 30 }, { move: 'c7c5', score: 10 }, { move: 'f7f6', score: -1000 }];
  assert.equal(selectCandidate(candidates, () => 0), 'e7e5');
  assert.equal(selectCandidate(candidates, () => 0.999), 'c7c5');
  assert.throws(() => selectCandidate([]));
});
