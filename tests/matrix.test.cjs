const test = require('node:test');
const assert = require('node:assert/strict');
const matrix = require('../matrix.js');

test('each difficulty deals exactly two of each unique card', () => {
  for (const level of matrix.LEVELS) {
    const deck = matrix.createDeck(level, () => 0.5);
    assert.equal(deck.length, level.rows * level.cols);
    const counts = new Map();
    for (const card of deck) counts.set(card.id, (counts.get(card.id) || 0) + 1);
    assert.equal(counts.size, deck.length / 2);
    assert.ok([...counts.values()].every(count => count === 2));
  }
});

test('a pair matches without consuming a mistake, while a mismatch consumes one', () => {
  const deck = [{ id: 'a' }, { id: 'a' }, { id: 'b' }, { id: 'c' }];
  const game = matrix.createState(deck, 2);
  assert.equal(matrix.flip(game, 0).type, 'first');
  assert.equal(matrix.flip(game, 1).type, 'match');
  assert.equal(game.matched.size, 2);
  assert.equal(game.mistakes, 0);
  matrix.flip(game, 2);
  assert.equal(matrix.flip(game, 3).type, 'mismatch');
  assert.equal(game.mistakes, 1);
});

test('matched and pending cards cannot be flipped again; last pair wins', () => {
  const game = matrix.createState([{ id: 'a' }, { id: 'a' }, { id: 'b' }, { id: 'b' }], 3);
  matrix.flip(game, 0);
  assert.equal(matrix.flip(game, 0).type, 'ignored');
  matrix.flip(game, 1);
  assert.equal(matrix.flip(game, 0).type, 'ignored');
  matrix.flip(game, 2);
  assert.equal(matrix.flip(game, 3).type, 'win');
});

test('reaching the mistake allowance ends the round', () => {
  const game = matrix.createState([{ id: 'a' }, { id: 'a' }, { id: 'b' }, { id: 'b' }], 1);
  matrix.flip(game, 0);
  assert.equal(matrix.flip(game, 2).type, 'lose');
  assert.equal(matrix.flip(game, 1).type, 'ignored');
});

test('levels grow in size and differ in card complexity, time and allowance', () => {
  assert.ok(matrix.LEVELS.length >= 5);
  for (let i = 1; i < matrix.LEVELS.length; i++) {
    assert.ok(matrix.LEVELS[i].rows * matrix.LEVELS[i].cols > matrix.LEVELS[i - 1].rows * matrix.LEVELS[i - 1].cols);
    assert.notEqual(matrix.LEVELS[i].seconds, matrix.LEVELS[i - 1].seconds);
    assert.notEqual(matrix.LEVELS[i].mistakes, matrix.LEVELS[i - 1].mistakes);
  }
});

test('deadline is enforced using elapsed wall-clock time before a flip', () => {
  assert.equal(matrix.timeRemaining(10000, 9999), 1);
  assert.equal(matrix.timeRemaining(10000, 10000), 0);
  assert.equal(matrix.timeRemaining(10000, 10500), 0);
});
