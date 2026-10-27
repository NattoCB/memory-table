const test = require('node:test');
const assert = require('node:assert/strict');
const { createSession } = require('../nback.js');

test('warm-up collects exactly N cards before asking for the card N positions earlier', () => {
  const draws = [0, 0.25, 0.5, 0.75];
  const game = createSession(2, 2, () => draws.shift());
  assert.equal(game.state.phase, 'warmup');
  game.advance();
  assert.equal(game.state.phase, 'warmup');
  game.advance();
  assert.equal(game.state.phase, 'answer');
  assert.deepEqual(game.state.target, game.state.cards[0]);
  assert.notDeepEqual(game.state.target, game.state.cards[1]);
});

test('scoring separately tracks suit, rank, and exact matches and finishes after specified questions', () => {
  const game = createSession(1, 2, () => 0);
  game.advance();
  game.submit('spades', 'A');
  assert.equal(game.state.exact, 1);
  game.advance();
  game.submit('hearts', 'A');
  assert.deepEqual([game.state.suitCorrect, game.state.rankCorrect, game.state.exact], [1, 2, 1]);
  assert.equal(game.state.phase, 'complete');
});

test('N is constrained to 1–30', () => {
  assert.throws(() => createSession(0));
  assert.throws(() => createSession(31));
  assert.throws(() => createSession(1.5));
  assert.doesNotThrow(() => createSession(30));
});

test('answer choices contain exactly one target and three distinct distractors', () => {
  const { createChoices } = require('../nback.js');
  const target = { suit: 'hearts', rank: 'Q' };
  const choices = createChoices(target, () => 0.5);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map(card => `${card.suit}:${card.rank}`)).size, 4);
  assert.equal(choices.filter(card => card.suit === target.suit && card.rank === target.rank).length, 1);
});

test('a timeout counts once as an incorrect answer and reveals the target', () => {
  const game = createSession(1, 2, () => 0);
  game.advance();
  game.timeout();
  assert.equal(game.state.answered, 1);
  assert.equal(game.state.exact, 0);
  assert.equal(game.state.lastResult.timedOut, true);
  assert.deepEqual(game.state.lastResult.target, { suit: 'spades', rank: 'A' });
  assert.equal(game.state.phase, 'feedback');
  game.timeout();
  assert.equal(game.state.answered, 1);
  game.advance();
  game.timeout();
  assert.equal(game.state.phase, 'complete');
  assert.equal(game.state.answered, 2);
});

test('each time difficulty has a distinct positive limit', () => {
  const { LEVELS } = require('../nback.js');
  assert.equal(LEVELS.length, 3);
  assert.equal(new Set(LEVELS.map(level => level.seconds)).size, 3);
  assert.ok(LEVELS.every(level => level.seconds > 0));
});
