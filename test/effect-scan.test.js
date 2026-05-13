const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function loadContextHelpers(extraContext = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'jsx', 'context.jsx'), 'utf8');
  const context = {
    AECreateContext: {},
    AECreateBridge: {},
    AECreateJSON: JSON,
    app: {},
    PropertyType: { PROPERTY: 6212 },
    ...extraContext
  };
  vm.runInNewContext(source, context, { filename: 'context.jsx' });
  return context.AECreateContext;
}

test('effectScanFileName makes stable safe filenames for plugin match names', () => {
  const helpers = loadContextHelpers();

  const name = helpers.effectScanFileName('tc Particular');

  assert.match(name, /^tc-Particular-fnv1a32-[0-9a-f]{8}\.json$/);
});

test('effectScanMatchesEffect identifies stale scans for the same plugin', () => {
  const helpers = loadContextHelpers();
  const previousScan = {
    effect: {
      name: 'Trapcode Particular',
      matchName: 'tc Particular'
    }
  };

  assert.equal(helpers.effectScanMatchesEffect(previousScan, {
    name: 'Trapcode Particular',
    matchName: 'tc Particular'
  }), true);
  assert.equal(helpers.effectScanMatchesEffect(previousScan, {
    name: 'Deep Glow',
    matchName: 'PEDG'
  }), false);
});

test('effectParameterTree records writable metadata and match paths', () => {
  const helpers = loadContextHelpers();
  const property = {
    propertyIndex: 1,
    name: 'Birth Rate',
    matchName: 'CC Particle World-0004',
    propertyType: 6212,
    propertyValueType: 6417,
    canSetExpression: true,
    canVaryOverTime: true,
    isTimeVarying: false,
    numKeys: 0,
    value: 2
  };
  const group = {
    numProperties: 1,
    property(index) {
      return index === 1 ? property : null;
    }
  };

  const records = helpers.effectParameterTree(group, {
    maxDepth: 4,
    maxRecords: 10,
    errors: [],
    count: 0,
    truncated: false
  });

  assert.equal(JSON.stringify(records), JSON.stringify([{
    index: 1,
    name: 'Birth Rate',
    matchName: 'CC Particle World-0004',
    propertyType: 6212,
    propertyValueType: 6417,
    canSetExpression: true,
    canVaryOverTime: true,
    isTimeVarying: false,
    path: ['Birth Rate'],
    matchPath: ['CC Particle World-0004'],
    value: 2,
    keyCount: 0
  }]));
});

test('effectParameterTree records AE value ranges when exposed', () => {
  const helpers = loadContextHelpers();
  const property = {
    propertyIndex: 1,
    name: 'Affect Position',
    matchName: 'tc Particular-0711',
    propertyType: 6212,
    propertyValueType: 6417,
    canSetExpression: true,
    canVaryOverTime: true,
    isTimeVarying: false,
    hasMin: true,
    minValue: 0,
    hasMax: true,
    maxValue: 100,
    unitsText: '%',
    numKeys: 0,
    value: 0
  };
  const group = {
    numProperties: 1,
    property(index) {
      return index === 1 ? property : null;
    }
  };

  const records = helpers.effectParameterTree(group, {
    maxDepth: 4,
    maxRecords: 10,
    errors: [],
    count: 0,
    truncated: false
  });

  assert.equal(records[0].hasMin, true);
  assert.equal(records[0].minValue, 0);
  assert.equal(records[0].hasMax, true);
  assert.equal(records[0].maxValue, 100);
  assert.equal(records[0].unitsText, '%');
});

test('effectParameterTree omits hidden disabled and internal parameters from visible scans', () => {
  const helpers = loadContextHelpers();
  const visibleProperty = {
    propertyIndex: 1,
    name: 'Particles/sec',
    matchName: 'tc Particular-0146',
    propertyType: 6212,
    propertyValueType: 6417,
    canSetExpression: true,
    canVaryOverTime: true,
    isTimeVarying: false,
    numKeys: 0,
    value: 100
  };
  const hiddenProperty = {
    propertyIndex: 2,
    name: 'Emitter Type Old',
    matchName: 'tc Particular-0005',
    propertyType: 6212,
    elided: true,
    numKeys: 0,
    value: 1
  };
  const disabledProperty = {
    propertyIndex: 3,
    name: 'Emitter Size Y',
    matchName: 'tc Particular-0015',
    propertyType: 6212,
    enabled: false,
    numKeys: 0,
    value: 500
  };
  const internalProperty = {
    propertyIndex: 4,
    name: '',
    matchName: 'tc Particular-0580',
    propertyType: 6212,
    numKeys: 0,
    value: null
  };
  const group = {
    numProperties: 4,
    property(index) {
      return [visibleProperty, hiddenProperty, disabledProperty, internalProperty][index - 1] || null;
    }
  };

  const records = helpers.effectParameterTree(group, helpers.effectScanOptions({}));

  assert.equal(JSON.stringify(records.map((record) => record.matchName)), JSON.stringify(['tc Particular-0146']));
});

test('plugin file candidate scoring matches effect identity tokens', () => {
  const helpers = loadContextHelpers();

  const score = helpers.pluginFileCandidateScore({
    name: 'Trapcode Particular',
    matchName: 'tc Particular',
    category: 'RG Particles and 3D'
  }, 'C:/Program Files/Adobe/Common/Plug-ins/7.0/MediaCore/Trapcode/Particular.aex');

  assert.ok(score > 0);
});

test('pluginWorkflow recommends carrier and helper layers for particle effects', () => {
  const helpers = loadContextHelpers();

  const workflow = helpers.pluginWorkflow({
    name: 'Trapcode Particular',
    matchName: 'tc Particular',
    category: 'RG Particles and 3D'
  });

  assert.equal(workflow.layerStrategy, 'solidCarrier');
  assert.equal(workflow.carrierLayer.type, 'solid');
  assert.deepEqual(workflow.helperLayers.map((layer) => layer.type), ['light', 'null']);
  assert.ok(workflow.recommendedActionTypes.includes('addSolidLayer'));
  assert.ok(workflow.recommendedActionTypes.includes('addLightLayer'));
  assert.ok(workflow.recommendedActionTypes.includes('setLayerProperties'));
});

test('pluginWorkflow distinguishes adjustment-layer and source-layer effects', () => {
  const helpers = loadContextHelpers();

  const twitch = helpers.pluginWorkflow({
    name: 'Twitch',
    matchName: 'Twitch',
    category: 'Video Copilot'
  });
  const twixtor = helpers.pluginWorkflow({
    name: 'Twixtor Pro',
    matchName: 'Twixtor Pro',
    category: 'RE:Vision Effects'
  });

  assert.equal(twitch.layerStrategy, 'adjustmentLayer');
  assert.ok(twitch.recommendedActionTypes.includes('addAdjustmentLayer'));
  assert.equal(twixtor.layerStrategy, 'sourceLayer');
  assert.equal(twixtor.destructiveRisk, 'retimes-source-layer');
  assert.equal(twixtor.recommendedActionTypes.includes('addAdjustmentLayer'), false);
});

test('pluginWorkflow marks unknown plugins for future online research', () => {
  const helpers = loadContextHelpers();

  const workflow = helpers.pluginWorkflow({
    name: 'Mystery Render FX',
    matchName: 'Mystery Render FX',
    category: 'Unknown Vendor'
  });

  assert.equal(workflow.layerStrategy, 'unknown');
  assert.equal(workflow.onlineResearch.status, 'needed');
  assert.ok(workflow.onlineResearch.queries[0].includes('Mystery Render FX'));
  assert.ok(workflow.recommendedActionTypes.includes('addEffect'));
});

test('effectWorkflowCatalog records workflows for available effects', () => {
  const helpers = loadContextHelpers();

  const catalog = helpers.effectWorkflowCatalog([{
    name: 'Deep Glow',
    matchName: 'Deep Glow',
    category: 'Plugin Everything'
  }, {
    name: 'Mystery Render FX',
    matchName: 'Mystery Render FX',
    category: 'Unknown Vendor'
  }]);

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.effects.length, 2);
  assert.equal(catalog.effects[0].workflow.layerStrategy, 'adjustmentLayer');
  assert.equal(catalog.effects[1].workflow.layerStrategy, 'unknown');
  assert.equal(catalog.effects[1].workflow.onlineResearch.status, 'needed');
});

test('scanEffectParametersData includes inferred plugin workflow', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'jsx', 'context.jsx'), 'utf8');
  class CompItem {}
  const effect = { numProperties: 0 };
  const layer = {
    property(name) {
      if (name === 'ADBE Effect Parade') {
        return {
          addProperty(effectName) {
            assert.equal(effectName, 'Twitch');
            return effect;
          }
        };
      }
      return null;
    },
    remove() {}
  };
  const comp = new CompItem();
  comp.width = 1280;
  comp.height = 720;
  comp.pixelAspect = 1;
  comp.layers = {
    addSolid() {
      return layer;
    }
  };
  const context = {
    AECreateContext: {},
    AECreateJSON: JSON,
    AECreateBridge: {
      fail(message) {
        throw new Error(message);
      }
    },
    app: {
      project: { activeItem: comp },
      beginUndoGroup() {},
      endUndoGroup() {}
    },
    CompItem,
    PropertyType: { PROPERTY: 6212 }
  };

  vm.runInNewContext(source, context, { filename: 'context.jsx' });
  const scan = context.AECreateContext.scanEffectParametersData({
    name: 'Twitch',
    matchName: 'Twitch',
    category: 'Video Copilot'
  }, { includePluginFiles: false });

  assert.equal(scan.workflow.layerStrategy, 'adjustmentLayer');
  assert.ok(scan.workflow.recommendedActionTypes.includes('addAdjustmentLayer'));
});

test('findEffectInfo matches installed effects by display name or match name', () => {
  const helpers = loadContextHelpers({
    app: {
      effects: [{
        displayName: 'Trapcode Particular',
        matchName: 'tc Particular',
        category: 'RG Particles and 3D'
      }]
    }
  });

  assert.equal(helpers.findEffectInfo('particular').matchName, 'tc Particular');
  assert.equal(helpers.findEffectInfo('tc Particular').name, 'Trapcode Particular');
});

test('listAvailableEffects bridge response includes effect suggestions', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'jsx', 'context.jsx'), 'utf8');
  const context = {
    AECreateContext: {},
    AECreateJSON: JSON,
    AECreateBridge: {
      respond(object) {
        return JSON.stringify(object);
      }
    },
    app: {
      effects: [{
        displayName: 'Pixel Sorter 3',
        matchName: 'GG PixelSorter3',
        category: 'Pixel Sorter Studio'
      }]
    },
    PropertyType: { PROPERTY: 6212 }
  };

  vm.runInNewContext(source, context, { filename: 'context.jsx' });
  const result = JSON.parse(context.AECreateBridge.listAvailableEffects());

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result.effects), JSON.stringify([{
    name: 'Pixel Sorter 3',
    matchName: 'GG PixelSorter3',
    category: 'Pixel Sorter Studio'
  }]));
});
