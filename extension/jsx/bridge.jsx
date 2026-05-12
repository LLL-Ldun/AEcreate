//@include "json.jsx"
//@include "context.jsx"
//@include "actions.jsx"

var AECreateBridge = AECreateBridge || {};

AECreateBridge.extensionRoot = function () {
  return File($.fileName).parent.fsName;
};

AECreateBridge.settingsFile = function () {
  return File(AECreateBridge.extensionRoot() + '/settings.json');
};

AECreateBridge.defaultBridgeDir = function () {
  return Folder.myDocuments.fsName + '/AEcreate/ae-codex-bridge';
};

AECreateBridge.readText = function (file) {
  if (!file.exists) return null;
  file.encoding = 'UTF-8';
  file.open('r');
  var text = file.read();
  file.close();
  return text;
};

AECreateBridge.writeText = function (file, text) {
  var folder = file.parent;
  if (!folder.exists) folder.create();
  file.encoding = 'UTF-8';
  file.open('w');
  file.write(text);
  file.close();
};

AECreateBridge.settings = function () {
  var file = AECreateBridge.settingsFile();
  var defaults = {
    bridgeDir: AECreateBridge.defaultBridgeDir(),
    presetPaths: [],
    historyLimit: 50,
    showAdvancedLogs: false
  };
  var text = AECreateBridge.readText(file);
  if (!text) return defaults;
  try {
    var parsed = AECreateJSON.parse(text);
    if (parsed.bridgeDir) defaults.bridgeDir = parsed.bridgeDir;
    if (parsed.presetPaths instanceof Array) defaults.presetPaths = parsed.presetPaths;
    if (parsed.historyLimit > 0) defaults.historyLimit = parsed.historyLimit;
    defaults.showAdvancedLogs = parsed.showAdvancedLogs === true;
  } catch (error) {}
  return defaults;
};

AECreateBridge.saveSettings = function (settings) {
  AECreateBridge.writeText(AECreateBridge.settingsFile(), AECreateJSON.stringify(settings));
};

AECreateBridge.bridgeFolder = function () {
  var settings = AECreateBridge.settings();
  var folder = Folder(settings.bridgeDir);
  if (!folder.exists) folder.create();
  Folder(folder.fsName + '/history').create();
  Folder(folder.fsName + '/favorites').create();
  Folder(folder.fsName + '/logs').create();
  return folder;
};

AECreateBridge.respond = function (object) {
  return AECreateJSON.stringify(object);
};

AECreateBridge.chooseBridgeFolder = function () {
  var folder = Folder.selectDialog('Choose AEcreate bridge folder');
  if (!folder) return AECreateBridge.respond({ ok: false, error: 'Bridge folder selection cancelled.' });
  var settings = AECreateBridge.settings();
  settings.bridgeDir = folder.fsName;
  AECreateBridge.saveSettings(settings);
  AECreateBridge.bridgeFolder();
  return AECreateBridge.respond({ ok: true, message: 'Bridge folder: ' + folder.fsName });
};

AECreateBridge.openBridgeFolder = function () {
  AECreateBridge.bridgeFolder().execute();
  return AECreateBridge.respond({ ok: true, message: 'Opened bridge folder.' });
};
