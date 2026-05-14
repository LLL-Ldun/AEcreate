//@include "json.jsx"

var AECreateBridge = AECreateBridge || {};

AECreateBridge.loadWarnings = [];

AECreateBridge.fail = function (message) {
  throw new Error(message);
};

AECreateBridge.extensionRoot = function () {
  return new File(String($.fileName)).parent.fsName;
};

AECreateBridge.settingsFile = function () {
  return new File(AECreateBridge.extensionRoot() + '/settings.json');
};

AECreateBridge.defaultBridgeDir = function () {
  return Folder.myDocuments.fsName + '/AEcreate/ae-codex-bridge';
};

AECreateBridge.errorSuffix = function (object) {
  return object && object.error ? ': ' + object.error : '';
};

AECreateBridge.ensureFolder = function (folder, label) {
  if (!(folder instanceof Folder)) AECreateBridge.fail(label + ' is not a folder.');
  if (!folder.exists && !folder.create()) {
    AECreateBridge.fail('Unable to create ' + label + ': ' + folder.fsName + AECreateBridge.errorSuffix(folder));
  }
  if (!folder.exists) AECreateBridge.fail('Unable to verify ' + label + ': ' + folder.fsName);
  return folder;
};

AECreateBridge.readText = function (file) {
  if (!file.exists) return null;
  file.encoding = 'UTF-8';
  if (!file.open('r')) AECreateBridge.fail('Unable to open file for reading: ' + file.fsName + AECreateBridge.errorSuffix(file));
  var text = file.read();
  var readError = file.error;
  if (!file.close()) AECreateBridge.fail('Unable to close file after reading: ' + file.fsName + AECreateBridge.errorSuffix(file));
  if (readError) AECreateBridge.fail('Unable to read file: ' + file.fsName + ': ' + readError);
  return text;
};

AECreateBridge.writeText = function (file, text) {
  AECreateBridge.ensureFolder(file.parent, 'parent folder');
  file.encoding = 'UTF-8';
  if (!file.open('w')) AECreateBridge.fail('Unable to open file for writing: ' + file.fsName + AECreateBridge.errorSuffix(file));
  if (!file.write(text)) {
    var writeError = file.error;
    file.close();
    AECreateBridge.fail('Unable to write file: ' + file.fsName + (writeError ? ': ' + writeError : ''));
  }
  if (!file.close()) AECreateBridge.fail('Unable to close file after writing: ' + file.fsName + AECreateBridge.errorSuffix(file));
};

AECreateBridge.appendText = function (file, text) {
  AECreateBridge.ensureFolder(file.parent, 'parent folder');
  file.encoding = 'UTF-8';
  if (!file.open('a')) AECreateBridge.fail('Unable to open file for appending: ' + file.fsName + AECreateBridge.errorSuffix(file));
  if (!file.write(text)) {
    var writeError = file.error;
    file.close();
    AECreateBridge.fail('Unable to append file: ' + file.fsName + (writeError ? ': ' + writeError : ''));
  }
  if (!file.close()) AECreateBridge.fail('Unable to close file after appending: ' + file.fsName + AECreateBridge.errorSuffix(file));
};

AECreateBridge.safeFileSize = function (file) {
  try {
    return file && file.exists ? file.length : 0;
  } catch (error) {
    return -1;
  }
};

AECreateBridge.operationLogFile = function (bridgeFolder) {
  var logs = AECreateBridge.ensureFolder(new Folder(bridgeFolder.fsName + '/logs'), 'logs folder');
  return new File(logs.fsName + '/panel-operations.jsonl');
};

AECreateBridge.operationSnapshot = function (bridgeFolder) {
  return {
    bridgeDir: bridgeFolder.fsName,
    pendingActionBytes: AECreateBridge.safeFileSize(new File(bridgeFolder.fsName + '/pending-action.json')),
    pendingPlansBytes: AECreateBridge.safeFileSize(new File(bridgeFolder.fsName + '/pending-plans.json')),
    currentContextBytes: AECreateBridge.safeFileSize(new File(bridgeFolder.fsName + '/current-context.json')),
    effectCatalogBytes: AECreateBridge.safeFileSize(new File(bridgeFolder.fsName + '/effect-catalog.json')),
    effectWorkflowsBytes: AECreateBridge.safeFileSize(new File(bridgeFolder.fsName + '/effect-workflows.json'))
  };
};

AECreateBridge.operationPayloadSummary = function (payloadText) {
  var summary = { bytes: String(payloadText || '').length };
  try {
    var payload = payloadText ? AECreateJSON.parse(payloadText) : {};
    var keys = [];
    for (var key in payload) {
      if (payload.hasOwnProperty(key)) keys.push(key);
    }
    summary.keys = keys;
    if (payload.checked && typeof payload.checked.length === 'number') summary.checkedCount = payload.checked.length;
    if (payload.plan && payload.plan.modules && typeof payload.plan.modules.length === 'number') summary.planModuleCount = payload.plan.modules.length;
    if (payload.query) summary.query = String(payload.query).substr(0, 80);
    if (payload.name) summary.name = String(payload.name).substr(0, 80);
    if (payload.target) summary.target = String(payload.target).substr(0, 40);
    if (payload.gpuMode) summary.gpuMode = String(payload.gpuMode);
    if (payload.id) summary.id = String(payload.id).substr(0, 80);
  } catch (error) {
    summary.parseError = String(error);
  }
  return summary;
};

AECreateBridge.operationResultSummary = function (resultText, errorMessage) {
  var summary = { bytes: String(resultText || '').length };
  if (errorMessage) summary.error = String(errorMessage).substr(0, 240);
  try {
    var result = resultText ? AECreateJSON.parse(resultText) : {};
    if (typeof result.ok === 'boolean') summary.ok = result.ok;
    if (result.error) summary.error = String(result.error).substr(0, 240);
    if (result.message) summary.message = String(result.message).substr(0, 160);
    if (result.archive && result.archive.plans && typeof result.archive.plans.length === 'number') summary.archivePlanCount = result.archive.plans.length;
    if (result.plan && result.plan.modules && typeof result.plan.modules.length === 'number') summary.planModuleCount = result.plan.modules.length;
  } catch (error) {}
  return summary;
};

AECreateBridge.trimOperationLog = function (file) {
  try {
    var maxBytes = 262144;
    var keepBytes = 196608;
    if (!file.exists || file.length <= maxBytes) return;
    var text = AECreateBridge.readText(file) || '';
    if (text.length <= keepBytes) return;
    text = text.substr(text.length - keepBytes);
    var firstBreak = text.indexOf('\n');
    if (firstBreak >= 0) text = text.substr(firstBreak + 1);
    AECreateBridge.writeText(file, text);
  } catch (error) {}
};

AECreateBridge.recordOperationEvent = function (operation, phase, payloadText, resultText, errorMessage) {
  try {
    var folder = AECreateBridge.bridgeFolder();
    var file = AECreateBridge.operationLogFile(folder);
    var event = {
      schemaVersion: 1,
      loggedAt: new Date().toString(),
      operation: String(operation || 'unknown'),
      phase: String(phase || 'event'),
      payload: AECreateBridge.operationPayloadSummary(payloadText || ''),
      result: AECreateBridge.operationResultSummary(resultText || '', errorMessage || ''),
      snapshot: AECreateBridge.operationSnapshot(folder)
    };
    AECreateBridge.appendText(file, AECreateJSON.stringify(event) + '\n');
    AECreateBridge.trimOperationLog(file);
    return true;
  } catch (error) {
    return false;
  }
};

AECreateBridge.settings = function () {
  var file = AECreateBridge.settingsFile();
  var defaults = {
    bridgeDir: AECreateBridge.defaultBridgeDir(),
    presetPaths: [],
    historyLimit: 50,
    gpuMode: 'integratedSafe',
    showAdvancedLogs: false
  };
  var text = AECreateBridge.readText(file);
  if (!text) return defaults;
  try {
    var parsed = AECreateJSON.parse(text);
    if (parsed.bridgeDir) defaults.bridgeDir = parsed.bridgeDir;
    if (parsed.presetPaths && typeof parsed.presetPaths.length === 'number') {
      defaults.presetPaths = [];
      for (var i = 0; i < parsed.presetPaths.length; i++) {
        if (parsed.presetPaths[i]) defaults.presetPaths.push(parsed.presetPaths[i]);
      }
    }
    if (parsed.historyLimit > 0) defaults.historyLimit = parsed.historyLimit;
    defaults.gpuMode = parsed.gpuMode === 'discretePerformance' ? 'discretePerformance' : 'integratedSafe';
    defaults.showAdvancedLogs = parsed.showAdvancedLogs === true;
  } catch (error) {}
  return defaults;
};

AECreateBridge.saveSettings = function (settings) {
  AECreateBridge.writeText(AECreateBridge.settingsFile(), AECreateJSON.stringify(settings));
};

AECreateBridge.bridgeFolder = function () {
  var settings = AECreateBridge.settings();
  if (!settings.bridgeDir) AECreateBridge.fail('Bridge folder path is empty.');
  var folder = AECreateBridge.ensureFolder(new Folder(settings.bridgeDir), 'bridge folder');
  AECreateBridge.ensureFolder(new Folder(folder.fsName + '/history'), 'history folder');
  AECreateBridge.ensureFolder(new Folder(folder.fsName + '/favorites'), 'favorites folder');
  AECreateBridge.ensureFolder(new Folder(folder.fsName + '/logs'), 'logs folder');
  return folder;
};

AECreateBridge.respond = function (object) {
  return AECreateJSON.stringify(object);
};

AECreateBridge.chooseBridgeFolder = function () {
  try {
    var folder = Folder.selectDialog('Choose AEcreate bridge folder');
    if (!folder) return AECreateBridge.respond({ ok: false, error: 'Bridge folder selection cancelled.' });
    var settings = AECreateBridge.settings();
    settings.bridgeDir = folder.fsName;
    AECreateBridge.saveSettings(settings);
    AECreateBridge.bridgeFolder();
    return AECreateBridge.respond({ ok: true, message: 'Bridge folder: ' + folder.fsName });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.getSettings = function () {
  try {
    return AECreateBridge.respond({ ok: true, settings: AECreateBridge.settings() });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.pathExistsInList = function (paths, path) {
  var key = String(path).toLowerCase();
  for (var i = 0; i < paths.length; i++) {
    if (String(paths[i]).toLowerCase() === key) return true;
  }
  return false;
};

AECreateBridge.choosePresetFolder = function () {
  try {
    var folder = Folder.selectDialog('Choose AE preset scan folder');
    if (!folder) return AECreateBridge.respond({ ok: false, error: 'Preset folder selection cancelled.' });
    var settings = AECreateBridge.settings();
    if (!settings.presetPaths || typeof settings.presetPaths.length !== 'number') settings.presetPaths = [];
    if (!AECreateBridge.pathExistsInList(settings.presetPaths, folder.fsName)) settings.presetPaths.push(folder.fsName);
    AECreateBridge.saveSettings(settings);
    return AECreateBridge.respond({ ok: true, message: 'Added preset path: ' + folder.fsName, settings: settings });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.clearPresetFolders = function () {
  try {
    var settings = AECreateBridge.settings();
    settings.presetPaths = [];
    AECreateBridge.saveSettings(settings);
    return AECreateBridge.respond({ ok: true, message: 'Cleared custom preset paths.', settings: settings });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.setGpuMode = function (payloadText) {
  try {
    var payload = payloadText ? AECreateJSON.parse(payloadText) : {};
    var settings = AECreateBridge.settings();
    settings.gpuMode = payload.gpuMode === 'discretePerformance' ? 'discretePerformance' : 'integratedSafe';
    AECreateBridge.saveSettings(settings);
    return AECreateBridge.respond({ ok: true, message: 'GPU mode: ' + settings.gpuMode, settings: settings });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.openBridgeFolder = function () {
  try {
    var folder = AECreateBridge.bridgeFolder();
    if (!folder.execute()) AECreateBridge.fail('Unable to open bridge folder: ' + folder.fsName + AECreateBridge.errorSuffix(folder));
    return AECreateBridge.respond({ ok: true, message: 'Opened bridge folder.' });
  } catch (error) {
    return AECreateBridge.respond({ ok: false, error: String(error) });
  }
};

AECreateBridge.loadOptionalScript = function (fileName) {
  var file = new File(AECreateBridge.extensionRoot() + '/' + fileName);
  if (!file.exists) {
    AECreateBridge.loadWarnings.push(fileName + ' not found; skipping.');
    return false;
  }
  try {
    $.evalFile(file.fsName);
    return true;
  } catch (error) {
    AECreateBridge.loadWarnings.push(fileName + ' failed to load: ' + String(error));
    return false;
  }
};

AECreateBridge.loadOptionalScript('context.jsx');
AECreateBridge.loadOptionalScript('actions.jsx');
