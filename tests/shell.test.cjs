const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('main menu exposes both games and loads their standalone modules', () => {
  assert.ok(fs.existsSync('index.html'), 'index.html must exist');
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /data-game="nback"/);
  assert.match(html, /data-game="matrix"/);
  assert.match(html, /src="nback\.js"/);
  assert.match(html, /src="matrix\.js"/);
});
