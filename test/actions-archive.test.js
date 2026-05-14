const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

test('readPendingAction stores current pending plan in the archive without duplicates', () => {
  const context = loadActionsWithFiles({
    'C:/bridge/pending-action.json': JSON.stringify(createPlan('Glow Plan'))
  });

  const first = JSON.parse(context.AECreateBridge.readPendingAction());
  const second = JSON.parse(context.AECreateBridge.readPendingAction());
  const archive = JSON.parse(context.files['C:/bridge/pending-plans.json']);

  assert.equal(first.ok, true, first.error);
  assert.equal(first.archive.plans.length, 1);
  assert.equal(second.archive.plans.length, 1);
  assert.equal(archive.plans.length, 1);
  assert.equal(archive.plans[0].plan.title, 'Glow Plan');
});

test('restorePendingAction writes an archived plan back to pending-action.json', () => {
  const context = loadActionsWithFiles({
    'C:/bridge/pending-action.json': JSON.stringify(createPlan('First Plan'))
  });
  const archived = JSON.parse(context.AECreateBridge.readPendingAction());
  const id = archived.archive.plans[0].id;
  context.files['C:/bridge/pending-action.json'] = JSON.stringify(createPlan('Second Plan'));

  const restored = JSON.parse(context.AECreateBridge.restorePendingAction(JSON.stringify({ id })));
  const pending = JSON.parse(context.files['C:/bridge/pending-action.json']);

  assert.equal(restored.ok, true, restored.error);
  assert.equal(restored.plan.title, 'First Plan');
  assert.equal(pending.title, 'First Plan');
});

test('readPendingAction enriches effect property labels from scanned params', () => {
  const plan = createPlan('Particular Plan');
  plan.modules[0].actions = [{
    type: 'setKeyframes',
    effectMatchName: 'tc Particular',
    propertyPath: ['tc Particular-0146'],
    keys: [
      { time: 1, value: 100 },
      { time: 2, value: 200 }
    ]
  }];
  const context = loadActionsWithFiles({
    'C:/bridge/pending-action.json': JSON.stringify(plan),
    'C:/bridge/effect-params/tc-Particular.json': JSON.stringify({
      effect: { name: 'Trapcode Particular', matchName: 'tc Particular' },
      params: [{
        name: '粒子/秒',
        matchName: 'tc Particular-0146',
        path: ['粒子/秒'],
        matchPath: ['tc Particular-0146']
      }]
    })
  });

  const result = JSON.parse(context.AECreateBridge.readPendingAction());
  const action = result.plan.modules[0].actions[0];

  assert.equal(result.ok, true, result.error);
  assert.deepEqual(action.propertyPathDisplay, ['粒子/秒']);
  assert.equal(action.parameterName, '粒子/秒');
});

test('readPendingAction reads each effect param scan once while enriching many actions', () => {
  const plan = createPlan('Many Particular Params');
  plan.modules[0].actions = [
    {
      type: 'setProperty',
      effectMatchName: 'tc Particular',
      propertyPath: ['tc Particular-0146'],
      value: 100
    },
    {
      type: 'setProperty',
      effectMatchName: 'tc Particular',
      propertyPath: ['tc Particular-0581'],
      value: [1280, 720, 0]
    },
    {
      type: 'setKeyframes',
      effectMatchName: 'tc Particular',
      propertyPath: ['tc Particular-0146'],
      keys: [{ time: 1, value: 100 }, { time: 2, value: 200 }]
    }
  ];
  const context = loadActionsWithFiles({
    'C:/bridge/pending-action.json': JSON.stringify(plan),
    'C:/bridge/effect-params/tc-Particular.json': JSON.stringify({
      effect: { name: 'Trapcode Particular', matchName: 'tc Particular' },
      params: [
        { name: '粒子/秒', matchName: 'tc Particular-0146', path: ['粒子/秒'], matchPath: ['tc Particular-0146'] },
        { name: '位置', matchName: 'tc Particular-0581', path: ['位置'], matchPath: ['tc Particular-0581'] }
      ]
    })
  });

  const result = JSON.parse(context.AECreateBridge.readPendingAction());

  assert.equal(result.ok, true, result.error);
  assert.deepEqual(result.plan.modules[0].actions[0].propertyPathDisplay, ['粒子/秒']);
  assert.deepEqual(result.plan.modules[0].actions[1].propertyPathDisplay, ['位置']);
  assert.equal(context.readCounts['C:/bridge/effect-params/tc-Particular.json'], 1);
});

test('readPendingAction does not read effect param scans when no action needs labels', () => {
  const context = loadActionsWithFiles({
    'C:/bridge/pending-action.json': JSON.stringify(createPlan('Plain Plan')),
    'C:/bridge/effect-params/tc-Particular.json': JSON.stringify({
      effect: { name: 'Trapcode Particular', matchName: 'tc Particular' },
      params: [{ name: 'Particles/sec', matchName: 'tc Particular-0146', path: ['Particles/sec'], matchPath: ['tc Particular-0146'] }]
    })
  });

  const result = JSON.parse(context.AECreateBridge.readPendingAction());

  assert.equal(result.ok, true, result.error);
  assert.equal(context.readCounts['C:/bridge/effect-params/tc-Particular.json'], undefined);
});

function loadActionsWithFiles(initialFiles) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'jsx', 'actions.jsx'), 'utf8');
  const files = { ...initialFiles };
  const readCounts = {};

  function Folder(fsName) {
    this.fsName = fsName.replace(/\\/g, '/');
    this.exists = true;
  }
  Folder.prototype.getFiles = function getFiles(pattern) {
    const prefix = this.fsName.replace(/\/$/, '') + '/';
    return Object.keys(files)
      .filter((name) => name.startsWith(prefix))
      .filter((name) => !name.slice(prefix.length).includes('/'))
      .filter((name) => !pattern || pattern === '*.json' ? name.endsWith('.json') : true)
      .map((name) => new File(name));
  };

  function File(fsName) {
    this.fsName = fsName.replace(/\\/g, '/');
    const lastSlash = this.fsName.lastIndexOf('/');
    this.parent = new Folder(lastSlash >= 0 ? this.fsName.slice(0, lastSlash) : '');
  }
  Object.defineProperty(File.prototype, 'exists', {
    get() {
      return Object.prototype.hasOwnProperty.call(files, this.fsName);
    }
  });

  const context = vm.createContext({
    AECreateBridge: {
      bridgeFolder() {
        return new Folder('C:/bridge');
      },
      readText(file) {
        readCounts[file.fsName] = (readCounts[file.fsName] || 0) + 1;
        return files[file.fsName] || null;
      },
      writeText(file, text) {
        files[file.fsName] = text;
      },
      respond(object) {
        return JSON.stringify(object);
      },
      fail(message) {
        throw new Error(message);
      }
    },
    app: { project: {} },
    CompItem: function CompItem() {},
    File,
    Folder,
    Error,
    String,
    Date,
    isFinite,
    Math,
    files,
    readCounts
  });
  context.AECreateJSON = vm.runInContext('JSON', context);
  vm.runInContext(source, context, { filename: 'actions.jsx' });
  context.files = files;
  context.readCounts = readCounts;
  return context;
}

function createPlan(title) {
  return {
    schemaVersion: 1,
    createdAt: '2026-05-13T13:40:00+08:00',
    contextFingerprint: 'fingerprint',
    title,
    summary: `${title} summary`,
    target: { compId: 'active', layerIndex: 1, layerName: 'Layer 1' },
    modules: [{
      id: 'm1',
      title: 'Module',
      summary: 'Module summary',
      checked: true,
      actions: [{ type: 'addEffect', name: 'Deep Glow' }]
    }]
  };
}
