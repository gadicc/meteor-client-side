var supportedFormats = ['unipackage-unibuild-pre1'];
var removePackages = [ 'autoupdate', 'reload', 'reload-safetybelt' ];

var Bundles = new Mongo.Collection('bundles');
Bundles._ensureIndex({ sha: 1 });
// Bundles.remove({});

var UglifyJS = Meteor.npmRequire("uglify-js");

// from meteor/linker.js
var packageDot = function (name) {
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.exec(name))
    return "Package." + name;
  else
    return "Package['" + name + "']";
};

// TODO, just turn whole array into an object
function packageFromArray(packages, name) {
  for (var i=0; i < packages.length; i++)
    if (packages[i].packageName == name)
      return packages[i];
}

function getSelfAndImpliedExports(name, packages, recursiveOut) {
  var out = recursiveOut || {};
  var pack = packageFromArray(packages, name);

  _.each(pack.exports, function(xport) {
    out[xport] = name;
  });

  _.each(pack.dependencies, function(dep, packageName) {
    if (dep.implied)
      getSelfAndImpliedExports(packageName, packages, out);
  });

  return out;
}

function wrap(packageData, packages, removePackages) {
  var pre = '/* Package "' + packageData.packageName + '" wrapped by csp.meteor.com */\n\n' +
    '(function () {\n\n';
  var post = '\n/* Exports */\n' +
    "if (typeof Package === 'undefined') Package = {};\n" +
    packageDot(packageData.packageName) + " = { \n";;

  var webData = packageData.webBrowserJson;

  if (webData.uses && webData.uses.length
      && !webData.uses[0].unordered /* meteor hack for requiring Meteor */) {
    pre += '/* Imports */\n';
    _.each(webData.uses, function(dep) {
      if (!dep.weak && removePackages.indexOf(dep.package) === -1) {
        var depData;
        for (var i=0; i < packages.length; i++)
          if (packages[i].packageName == dep.package) {
            depData = packages[i]; break;
          }
        if (!depData)
          throw new Error("we use something that wasn't resolved??  wanted " + dep.package + " for " + packageData.packageName);
        _.each(depData.webBrowserJson.packageVariables, function(variable) {
          if (variable.export)
            pre += 'var ' + variable.name + ' = ' + packageDot(depData.packageName) + '.'
              + variable.name + ';\n';
        });
      }
    });
    pre += "\n";
  }

  if (supportedFormats.indexOf(webData.format) === -1) {
    // console.log(webData);
    throw new Error('Unsupported format: ' + packageData.format);
  }

  // TODO separate
  if (webData.packageVariables && webData.packageVariables.length) {
    pre += '/* Package-scope variables */\nvar ';

    _.each(webData.packageVariables, function(variable) {
      pre += variable.name + ', ';
      // TODO implied
      if (variable.export) {
        post += '  ' + variable.name + ': ' + variable.name + ',\n';
      }
    });

    pre = pre.substr(0, pre.length - 2) + ';\n\n';
  }
  post = post.substr(0, post.length - 2) + '\n};\n\n})();\n';

  // console.log(packageData.webBrowserJson);
  return pre + packageData.unminified + post + '\n\n';
}

var bundleRe1 = /\/bundle(\.min)?.js\?release=([^\&]+)&packages=(.*)/;
WebApp.connectHandlers.use(function(req, res, next) {
  var match = bundleRe1.exec(req.url);
  if (!match)
    return next();

  console.log(req.url + ' (request)');

  var serveMinified = !!match[1];
  var release = match[2];
  var packages = match[3].split('+');

  // every request package was given an explicity (@=) version
  var explicitVersions = true;

  var headers = {
    'content-type': 'application/javascript'
  };

  for (var i=0; i < packages.length; i++)
    if (!packages[i].match(/@=/)) {
      explicitVersions = false;
      break;
    }

  var bundle, requestSha;

  if (explicitVersions) {

    requestSha = SHA256(req.url);

    bundle = serveMinified &&
      Bundles.findOne({ requestShas: requestSha }, { fields: { minified: 1, sha: 1 } });

    if (bundle) {
      console.log(req.url + ' (serving from db - requestSha)');
      headers.etag = bundle.sha;
      headers['cache-control'] = 'max-age=3155692';
      res.writeHead(200, 'OK', headers);
      res.end(bundle.minified);
      return;
    }

  }

  var deps = genDeps(release, packages);
  var sha = genSha(deps);

  if (req.headers['if-none-match'] === sha) {
    console.log(req.url + ' (not sending - matched sha etag)');
    res.writeHead(304, 'Not Modified');
    res.end();
    return;
  }

  headers.etag = sha;
  headers['cache-control'] = 'max-age=' +
    (explicitVersions ? '3155692' : '3600');

  bundle = serveMinified && Bundles.findOne({ sha: sha }, { fields: { minified: 1 } });
  if (bundle) {
    // match from all package Sha but not requestSha, so let's add it
    Bundles.update(bundle.id, { $push: { requestShas: requestSha } });

    console.log(req.url + ' (serving from db)');

    res.writeHead(200, 'OK', headers);
    res.end(bundle.minified);
    return;
  }

  console.log(req.url + ' (generating bundle)');

  var bundle = genBundle(release, packages, deps, sha, requestSha);

  res.writeHead(200, 'OK', headers);
  res.end(bundle[serveMinified ? 'minified' : 'unminified']);
});

var bundleRe2 = /\/bundle(\.min)?.js\?hash=([^\&]+)/;
WebApp.connectHandlers.use(function(req, res, next) {
  var match = bundleRe2.exec(req.url);
  if (!match)
    return next();

  console.log(req.url + ' (request)');

  var serveMinified = !!match[1];
  var hash = match[2];

  var bundle = Bundles.findOne({ shortSha: hash });

  if (!bundle) {
    res.writeHead(404, 'Not Found');
    res.end();
    return;
  }

  res.writeHead(200, 'OK', {
    'content-type': 'application/javascript',
      'cache-control': 'max-age=3155692'
  });

  if (serveMinified) {

    res.end(bundle.minified);

  } else {

    res.end("// TODO :)\n");

  }

});

function genBundle(release, packages, deps, sha, requestSha) {
  deps = retrievePackageDataFor(deps);

  var out = 'if (typeof __meteor_runtime_config__ === "undefined")\n  __meteor_runtime_config__ = {};\n' +
    '__meteor_runtime_config__.meteorRelease = "' + release + '";\n' +
    'if (!__meteor_runtime_config__.ROOT_URL)\n  __meteor_runtime_config__.ROOT_URL = window.location\n' +
    'if (!__meteor_runtime_config__.ROOT_URL_PATH_PREFIX)\n  __meteor_runtime_config__.ROOT_URL_PATH_PREFIX = "";\n\n';

  var depsToSend = _.reject(deps, function(p) {
    return removePackages.indexOf(p.packageName) !== -1;
  });

  var usedVersions = {};
  _.each(depsToSend, function(packageData) {
    usedVersions[packageData.packageName] = packageData.version;
  });

  out += 'packageVersions = ' + JSON.stringify(usedVersions) + ';\n\n';

  _.each(depsToSend, function(packageData) {
    out += wrap(packageData, deps, removePackages);
  });

  out += '\n\n/* Imports for global scope */\n\n';
  _.each(packages, function(name) {
    name = name.replace(/\@.+$/, '');
    var globalExports = getSelfAndImpliedExports(name, deps);
    _.each(globalExports, function (packageName, variableName) {
      out += variableName + ' = ' + packageDot(packageName) + '.' + variableName + ';\n';
    });
  });

  // minify
  var toplevel = UglifyJS.parse(out);
  toplevel.figure_out_scope();
  var compressor = UglifyJS.Compressor({ warnings: false });
  var compressed_ast = toplevel.transform(compressor);
  compressed_ast.figure_out_scope();
  compressed_ast.compute_char_frequency();
  compressed_ast.mangle_names();
  var stream = UglifyJS.OutputStream();
  compressed_ast.print(stream);
  var minified = stream.toString('utf8');

  var bundle = {
    sha: sha,
    shortSha: sha.substr(0, 7),
    // unminified: out,
    minified: minified,
    requestShas: [ ]
    // store versions aswell?
  };

  if (requestSha)
    bundle.requestShas.push(requestSha);

  var id = Bundles.insert(bundle);
  bundle._id = id;
  bundle.unminified = out;

  return bundle;
}

Meteor.methods({
  genBundle: function(release, packages) {
    var deps = genDeps(release, packages);
    var sha = genSha(deps);

    var versions = [];
    _.each(deps, function(dep) {
      versions.push(dep.packageName + '@' + dep.version)
    });
    versions = versions.sort().join('\n');

    var bundle = Bundles.findOne({ sha: sha }, { fields: { minified: 1, shortSha: 1 } });
    if (!bundle) {
      console.log('Generating new bundle for ' + sha);
      bundle = genBundle(release, packages, deps, sha);
    }

    return {
      hash: bundle.shortSha,
      versions: versions
    }
  }
});
