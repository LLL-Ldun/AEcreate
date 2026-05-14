const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');

test('bridge loader uses stable filesystem path strings for optional JSX scripts', () => {
  const source = fs.readFileSync(path.join(root, 'extension', 'jsx', 'bridge.jsx'), 'utf8');

  assert.match(source, /new File\(String\(\$\.fileName\)\)/);
  assert.match(source, /\$\.evalFile\(file\.fsName\)/);
});

test('context JSX avoids raw non-ASCII text so ExtendScript evalFile cannot mojibake workflow strings', () => {
  const source = fs.readFileSync(path.join(root, 'extension', 'jsx', 'context.jsx'), 'utf8');
  const nonAscii = [];

  for (let index = 0; index < source.length; index++) {
    if (source.charCodeAt(index) > 127) {
      const line = source.slice(0, index).split(/\r?\n/).length;
      nonAscii.push({ line, char: source[index] });
      if (nonAscii.length >= 5) break;
    }
  }

  assert.deepEqual(nonAscii, []);
});
