var os = Npm.require('os');
var fs = Npm.require('fs');
var path = Npm.require('path');
var Fiber = Npm.require('fibers');

var tmp = Meteor.npmRequire('tmp');
var glob = Meteor.npmRequire('glob');

tmp.setGracefulCleanup();

Meteor.publish('genBundle', function(release, packages) {
  runMeteor(release, packages, this)
  this.ready();
});

/*
Meteor.methods({
  runMeteor: function(release, packages) {
    return runMeteor(release, packages);
  }
});
*/

var port = 20000;

function runMeteor(release, packages, subHandle) {
  var fiber = Fiber.current;

  tmp.dir({ unsafeCleanup: true }, function(err, tmpPath, tmpDirCleanup) {
    var meteorDir = path.join(tmpPath, '.meteor');
    fs.mkdir(meteorDir, function(err) {
      fs.writeFile(path.join(meteorDir, 'release'), release + '\n', function() {
        fs.writeFile(path.join(meteorDir, 'packages'), packages.join('\n') + '\n', function() {
          Fiber(function() {
            var meteor = new Process('meteor', ['-p', port++, '--production'], { cwd: tmpPath });

            meteor.process.stdout.on('data', function(data) {
              if (data.toString().match(/^\n=> App running at/)) {
                meteor.success = true;
                meteor.log('\n=> Bundle build successfully, exiting.', 1 /* STDOUT */);
                meteor.process.kill('SIGINT');
              }
            });

            meteor.process.on('exit', function(code) {
              var payload = {};
              var payloadLength = 2;

              // if (!meteor.success) ...

              var checkDone = function() {
                if (_.keys(payload).length === payloadLength) {

                  Fiber(function() {
                    if (subHandle)
                      subHandle.added('genBundle', 'data', {
                        hash: saveBundle(payload, release).shortSha,
                        versions: payload.versions
                      });

                    try { tmpDirCleanup(); }
                    catch (err) { }                  
                  }).run();
                }
              }

              fs.readFile(path.join(meteorDir, 'versions'), function(err, data) {
                payload.versions = data.toString('utf8');
                checkDone();
              });

              glob(path.join(meteorDir, 'local', 'build', 'programs', 'web.browser', '*.{js,css}'), function(err, files) {
                // CSS is optional
                if (files.length === 2)
                  payloadLength++;

                _.each(files, function(file) {
                  fs.readFile(file, function(err, data) {
                    payload[path.extname(file).substr(1)] = data.toString('utf8');
                    checkDone();
                  });
                });
              });

            });

            if (subHandle)
              subHandle.added('genBundle', 'logId', { logId: meteor._id });

            fiber.run(meteor._id);
          }).run();
        });
      });
    });
  });

  return Fiber.yield();
}

function saveBundle(data, release) {
  var out = 'if (typeof __meteor_runtime_config__ === "undefined")\n  __meteor_runtime_config__ = {};\n' +
    '__meteor_runtime_config__.meteorRelease = "' + release + '";\n' +
    'if (!__meteor_runtime_config__.ROOT_URL)\n  __meteor_runtime_config__.ROOT_URL = window.location.href;\n' +
    'if (!__meteor_runtime_config__.ROOT_URL_PATH_PREFIX)\n  __meteor_runtime_config__.ROOT_URL_PATH_PREFIX = "";\n\n';

  var sha = SHA256(data.versions);

  var bundle = Bundles.findOne( {sha:sha}, { fields:{_id:1}, limit:1 });
  if (bundle)
    return bundle; // append requestSha?

  bundle = {
    sha: sha,
    shortSha: sha.substr(0, 7),
    // unminified: out,
    minified: out + data.js,  // TODO, unminified
    requestShas: [ ]
    // store versions aswell?
  };

  if (data.css)
    bundle.css = data.css;

  // if (requestSha)
  //  bundle.requestShas.push(requestSha);

  bundle._id = Bundles.insert(bundle);
  //bundle.unminified = out;

  return bundle;
}