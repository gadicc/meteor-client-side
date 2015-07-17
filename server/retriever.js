var Fiber = Npm.require('fibers');

retrievePackageDataFor = function(deps) {
  var fiber = Fiber.current;
  var remaining = deps.length;

  _.each(deps, function(dep, i) {
    new Fiber(function() {
      var orig = deps[i];
      deps[i] = retrievePackage({ packageName: dep.packageName, version: dep.version });
      if (orig.exports)      deps[i].exports = orig.exports;
      if (orig.dependencies) deps[i].dependencies = orig.dependencies;

      if (--remaining === 0)
        fiber.run(deps);
    }).run();
  });

  return Fiber.yield();
}

