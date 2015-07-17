// XXX add var back before commit

PV = PackageVersion;
CS = ConstraintSolver;

catalog = {

  getSortedVersionRecords: function (name) {
    var records = packageServer.versions.find({packageName: name}).fetch();
    records.sort(function (a, b) {
      return PV.compare(a.version, b.version);
    });
    return records;
  }

}

trackVersionConstraints = function(track, version) {
  var constraints = [];

  var releaseVersion = packageServer.releaseVersions.findOne({
    track: track,
    version: version
  });
  _.each(releaseVersion.packages, function(version, name) {
    constraints.push(
      new PV.PackageConstraint(name, '='+version));
  });
  return constraints;
};

resolver = new CS.PackagesResolver(catalog);

resolve = function(releaseString, packages) {
  var release = releaseString.split('@');

  var deps = [];
  var constraints = trackVersionConstraints(release[0], release[1]);

  _.each(packages, function(line) {
    line = line.split('@');
    deps.push(line[0]);
    if (line[1])
      constraints.push(
        new PV.PackageConstraint(line[0], line[1]));
  });

  return resolver.resolve(deps, constraints);
}

sort = function(resolvedDeps) {
  var ordered = [];

  // if we're enthusiastic we could do this in parallel like the http gets
  _.each(resolvedDeps.answer, function(versionString, packageName) {
    var version = packageServer.versions.findOne({
      packageName: packageName,
      version: versionString
    });

    var deps = _.keys(version.dependencies); // TODO unordered: true

    var data = {
      packageName: packageName,
      version: versionString,
      deps: [],                   // array of package names
      versionId: version._id,
      exports: [],
      dependencies: {}            // map from package name to object with implies/
    };

    _.each(version.exports, function(xport) {
      if (xport.architectures.indexOf('web.browser') !== -1)
        data.exports.push(xport.name);
    });

    _.each(version.dependencies, function(dep, key) {
      _.each(dep.references, function(ref) {
        if (ref.arch === 'web.browser') {
          data.dependencies[key] = ref;
          data.deps.push(key);
          return;
        }
      });
    });

    ordered.push(data);
  });

  var last = ordered.length - 1;
  while (last > 0) {
    for (var i=0; i < last; i++)
      if (ordered[i].deps.indexOf(ordered[last].packageName) !== -1
          && !ordered[i].dependencies[ordered[last].packageName].unordered) {
        ordered.splice(i, 0, ordered.splice(last, 1)[0]);
        break;
      }
    if (i === last)
      last--;
  }

  return ordered;
}

filter = function(orderedDeps) {
  var out = [];
  _.each(orderedDeps, function(dep) {
    var build = packageServer.builds.findOne({ versionId: dep.versionId });
    if (build.buildArchitectures.match(/web\.browser/))
      out.push({
        packageName: dep.packageName,
        version: dep.version,
        exports: dep.exports,
        dependencies: dep.dependencies
      });
  });
  return out;
}

genDeps = function(release, packages) {
  return filter(sort(resolve(release, packages)));
}

genSha = function(deps) {
  var src = '';
  _.each(deps, function(dep) {
    src += dep.packageName + ':' + dep.version + ',';  // final "," is ok.
  });
  return SHA256(src);
}
