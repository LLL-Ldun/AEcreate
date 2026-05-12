const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

test('bridge client reloads bridge.jsx before calling a JSX function', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'js', 'bridge-client.js'), 'utf8');
  let evaluatedScript = '';

  function CSInterface() {}
  CSInterface.prototype.getSystemPath = function getSystemPath(pathType) {
    assert.equal(pathType, 'extension');
    return 'C:/Users/16693/AppData/Roaming/Adobe/CEP/extensions/com.aecreate.codexbridge';
  };
  CSInterface.prototype.evalScript = function evalScript(script, callback) {
    evaluatedScript = script;
    callback('{"ok":true}');
  };

  const context = {
    window: {},
    CSInterface,
    SystemPath: { EXTENSION: 'extension' },
    JSON,
    Promise,
    String
  };
  vm.runInNewContext(source, context, { filename: 'bridge-client.js' });

  const client = new context.window.AECreateBridgeClient();
  const result = await client.call('scanPresets', {});

  assert.deepEqual(result, { ok: true });
  assert.match(evaluatedScript, /\$\.evalFile\(bridgeFile\)/);
  assert.match(evaluatedScript, /com\.aecreate\.codexbridge\/jsx\/bridge\.jsx/);
});
