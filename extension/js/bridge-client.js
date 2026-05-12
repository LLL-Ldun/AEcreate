(function () {
  function BridgeClient() {
    this.cs = new CSInterface();
  }

  BridgeClient.prototype.call = function call(functionName, payload) {
    var serialized = JSON.stringify(payload || {});
    var escaped = serialized.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var script = 'AECreateBridge.' + functionName + "('" + escaped + "')";
    return new Promise(function (resolve) {
      this.cs.evalScript(script, function (raw) {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          resolve({ ok: false, error: 'Invalid JSX response: ' + raw });
        }
      });
    }.bind(this));
  };

  window.AECreateBridgeClient = BridgeClient;
}());
