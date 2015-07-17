var re = /\/meteor.js\?release=([^\&]+)&deps=(.*)/;
WebApp.connectHandlers.use(function(req, res, next) {
  var match = re.exec(req.url);
  if (!match)
    return next();


  var out = 'var script;\n';
  var release = match[1];
  var packages = match[2].split(',');
  var importScript = '/* Imports for global scope */\n\n';

  var deps = genDeps(release, packages);
  console.log(deps);

  _.each(deps, function(dep) {
    out += 'script = document.createElement("script");\n' +
      'script.type = "text/javascript";\n' +
      'script.src = "' + Meteor.absoluteUrl(dep.packageName + '@' + dep.version + '.js') + '";\n' +
      'document.head.appendChild(script)\n';
    _.each(dep.exports, function(name) {
      importScript += name + " = Package['" + dep.packageName + "']." + name + ';\n';
    });
  });

  out += 'script = document.createElement("script");\n' +
    'script.type = "text/javascript";\n' +
    'script.text = ' + JSON.stringify(importScript) + '\n' +
    'document.head.appendChild(script)\n';

  res.end(out);
});
