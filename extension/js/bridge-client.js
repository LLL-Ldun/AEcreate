(function () {
  function BridgeClient() {
    this.cs = new CSInterface();
  }

  function escapeScriptString(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function buildScript(functionName, payloadText, bridgePath) {
    var escapedFunctionName = escapeScriptString(functionName);
    var escapedPayload = escapeScriptString(payloadText);
    var escapedBridgePath = escapeScriptString(bridgePath);
    return [
      '(function () {',
      '  function encodeResult(text) {',
      '    return typeof encodeURIComponent === \'function\' ? encodeURIComponent(text) : text;',
      '  }',
      '  function jsonError(message) {',
      '    return \'{"ok":false,"error":"\' + String(message)',
      '      .replace(/\\\\/g, \'\\\\\\\\\')',
      '      .replace(/"/g, \'\\\\"\')',
      '      .replace(/\\r/g, \'\\\\r\')',
      '      .replace(/\\n/g, \'\\\\n\') + \'"}\';',
      '  }',
      '  try {',
      '    var bridgeFile = new File(\'' + escapedBridgePath + '\');',
      '    if (bridgeFile.exists) {',
      '      $.evalFile(bridgeFile);',
      '    }',
      '    var functionName = \'' + escapedFunctionName + '\';',
      '    if (typeof AECreateBridge === \'undefined\') {',
      '      return encodeResult(jsonError(\'AECreateBridge is not loaded for \' + functionName));',
      '    }',
      '    if (typeof AECreateBridge[functionName] !== \'function\') {',
      '      var warnings = AECreateBridge.loadWarnings && AECreateBridge.loadWarnings.length ? \' Load warnings: \' + AECreateBridge.loadWarnings.join(\'; \') : \'\';',
      '      return encodeResult(jsonError(\'AECreateBridge.\' + functionName + \' is not a function.\' + warnings));',
      '    }',
      '    if (typeof AECreateBridge.recordOperationEvent === \'function\') {',
      '      AECreateBridge.recordOperationEvent(functionName, \'start\', \'' + escapedPayload + '\', \'\', \'\');',
      '    }',
      '    var resultText = AECreateBridge[functionName](\'' + escapedPayload + '\');',
      '    if (typeof AECreateBridge.recordOperationEvent === \'function\') {',
      '      AECreateBridge.recordOperationEvent(functionName, \'end\', \'' + escapedPayload + '\', resultText, \'\');',
      '    }',
      '    return encodeResult(resultText);',
      '  } catch (error) {',
      '    try {',
      '      var failedFunctionName = typeof functionName === \'undefined\' || !functionName ? \'' + escapedFunctionName + '\' : functionName;',
      '      if (typeof AECreateBridge !== \'undefined\' && typeof AECreateBridge.recordOperationEvent === \'function\') {',
      '        AECreateBridge.recordOperationEvent(failedFunctionName, \'error\', \'' + escapedPayload + '\', \'\', String(error));',
      '      }',
      '    } catch (logError) {}',
      '    return encodeResult(jsonError(\'AECreateBridge.\' + functionName + \' failed: \' + error));',
      '  }',
      '}())'
    ].join('\n');
  }

  BridgeClient.prototype.call = function call(functionName, payload) {
    var serialized = JSON.stringify(payload || {});
    var bridgePath = new CSInterface().getSystemPath(SystemPath.EXTENSION) + '/jsx/bridge.jsx';
    var script = buildScript(functionName, serialized, bridgePath);
    return new Promise(function (resolve) {
      this.cs.evalScript(script, function (raw) {
        var decoded = raw;
        try {
          decoded = decodeURIComponent(raw);
        } catch (decodeError) {}
        try {
          resolve(JSON.parse(decoded));
        } catch (error) {
          resolve({ ok: false, error: 'Invalid JSX response: ' + raw });
        }
      });
    }.bind(this));
  };

  window.AECreateBridgeClient = BridgeClient;
}());
