import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { lessons, units, recordResult, dueReviews, unitAvailable } from '../src/course.js';
test('all London lesson lines are legal and each starts with the London moves', () => {
  assert.equal(new Set(lessons.map(item => item.id)).size, lessons.length);
  for (const lesson of lessons) { const game = new Chess(); for (const move of lesson.moves) assert.ok(game.move(move), `${lesson.id}: ${move}`); }
  assert.ok(lessons.find(item => item.id === 'checkpoint').moves.filter((_, i) => i % 2 === 0).length >= 10);
});
test('guided units unlock only after previous lessons are complete', () => {
  assert.equal(unitAvailable(0, {}), true); assert.equal(unitAvailable(1, {}), false);
  const progress = Object.fromEntries(units[0].lessons.map(item => [item.id, { completed: true }]));
  assert.equal(unitAvailable(1, progress), true);
});
test('checkpoint needs 80% and no assistance; regular lessons can be assisted', () => {
  const now = Date.UTC(2026, 10, 13);
  for (const [score, assisted, completed] of [[0.8, false, true], [0.7, false, false], [1, true, false]])
    assert.equal(Boolean(recordResult({}, { score, assisted, checkpoint: true }, now).completed), completed);
  assert.equal(recordResult({}, { score: 0.5, assisted: true }, now).completed, true);
});
test('reviews become due after a day and instant retries do not grant mastery', () => {
  const now = Date.UTC(2026, 10, 13), result = { score: 1, assisted: false };
  let progress = recordResult({}, result, now);
  assert.equal(dueReviews({ [lessons[0].id]: progress }, now).length, 0);
  assert.equal(dueReviews({ [lessons[0].id]: progress }, now + 86400000).length, 1);
  progress = recordResult(progress, { ...result, review: true }, now + 1000);
  assert.equal(progress.mastered, false);
  assert.equal(progress.dueAt, new Date(now + 86400000).toISOString());
  assert.equal(progress.reviews, 0);
  progress = recordResult(progress, { ...result, review: true }, now + 86400000);
  progress = recordResult(progress, { ...result, review: true }, now + 2 * 86400000);
  assert.equal(progress.mastered, true);
});
