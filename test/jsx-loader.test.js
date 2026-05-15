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

test('bridge loader exposes disposable operation diagnostics helpers', () => {
  const source = fs.readFileSync(path.join(root, 'extension', 'jsx', 'bridge.jsx'), 'utf8');

  assert.match(source, /panel-operations\.jsonl/);
  assert.match(source, /AECreateBridge\.recordOperationEvent/);
  assert.match(source, /AECreateBridge\.operationSnapshot/);
});

test('bridge settings are persisted outside the installed extension and keep bridge history', () => {
  const source = fs.readFileSync(path.join(root, 'extension', 'jsx', 'bridge.jsx'), 'utf8');

  assert.match(source, /persistentSettingsFile/);
  assert.match(source, /Folder\.userData/);
  assert.match(source, /legacySettingsFile/);
  assert.match(source, /bridgeDirHistory/);
  assert.match(source, /rememberBridgeDir/);
});

test('development install preserves legacy extension settings before replacing the panel', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'install-dev.ps1'), 'utf8');

  assert.match(source, /\$persistentSettingsRoot/);
  assert.match(source, /\$legacySettings/);
  assert.match(source, /Copy-Item -LiteralPath \$legacySettings -Destination \$persistentSettings -Force/);
  assert.match(source, /Remove-Item -LiteralPath \$target -Recurse -Force/);
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
