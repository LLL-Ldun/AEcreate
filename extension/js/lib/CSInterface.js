var SystemPath = SystemPath || {
  EXTENSION: 'extension'
};

function CSInterface() {}

CSInterface.prototype.getSystemPath = function getSystemPath(pathType) {
  if (window.__adobe_cep__ && window.__adobe_cep__.getSystemPath) {
    return window.__adobe_cep__.getSystemPath(pathType);
  }
  var path = window.location && window.location.pathname ? decodeURIComponent(window.location.pathname) : '';
  path = path.replace(/^\/([A-Za-z]:\/)/, '$1').replace(/\/index\.html$/i, '');
  return path || '.';
};

CSInterface.prototype.evalScript = function evalScript(script, callback) {
  if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
    window.__adobe_cep__.evalScript(script, callback);
  } else if (callback) {
    callback(JSON.stringify({ ok: false, error: 'CEP runtime is not available.' }));
  }
};
