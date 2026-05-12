var AECreateJSON = AECreateJSON || {};

AECreateJSON.stringify = function (value) {
  if (typeof JSON !== 'undefined' && JSON.stringify) return JSON.stringify(value);
  function esc(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  }
  function write(v) {
    if (v === null) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'string') return '"' + esc(v) + '"';
    if (v instanceof Array) {
      var items = [];
      for (var i = 0; i < v.length; i++) items.push(write(v[i]));
      return '[' + items.join(',') + ']';
    }
    var props = [];
    for (var key in v) if (v.hasOwnProperty(key)) props.push('"' + esc(key) + '":' + write(v[key]));
    return '{' + props.join(',') + '}';
  }
  return write(value);
};

AECreateJSON.parse = function (text) {
  if (typeof JSON !== 'undefined' && JSON.parse) return JSON.parse(text);
  return eval('(' + text + ')');
};
