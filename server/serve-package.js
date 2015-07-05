var gunzip = Meteor.npmRequire('gunzip-maybe');
var tar = Meteor.npmRequire('tar-stream');
var https = Npm.require('https');
var Fiber = Npm.require('fibers');

var packages = new Mongo.Collection('packages');

// Note: we call update() on a notFound too
var updatePackages = _.throttle(packageServer.update, 10000);
Meteor.setInterval(updatePackages, 60000);

function resEnd(res, buffer) {
  res.writeHead(200, 'OK', {
    'content-type': 'application/javascript',
    'cache-control': 'max-age=3155692'
  });

  res.end(buffer, 'utf8');
}

var re = /^\/([^@]+)@(.*?)\.js$/;
WebApp.connectHandlers.use(function(req, res, next) {
  console.log(req.url);

  var match = re.exec(req.url);
  if (!match)
    return next();

  var packageName = match[1];
  var version = match[2];

  var packageData = {
    packageName: packageName,
    version: version
  };

  var existing = packages.findOne(packageData);
  if (existing) {
    console.log('* from cache');
    return resEnd(res, existing.unminified);
  }

  var version = packageServer.versions.findOne(packageData);

  if (!version) {
    console.log('* not found.');
    res.writeHead(404, 'Not Found');
    res.end();
    Fiber(updatePackages).run();
    return;
  }

  var build = packageServer.builds.findOne({ versionId: version._id });
  if (!build) {
    res.writeHead(500, 'Internal error');  // I guess it's also 404, but weird case
    res.end();
    return;
  }

  var extract = tar.extract();
  extract.on('entry', function(header, stream, next) {

    // more checks?
    // 'gadicohen_famous-views-1.2.0/web.browser/packages/gadicohen_famous-views.js',

    if (header.name.match(/^[^\/]+\/web.browser\/packages\/[^\.]+.js$/)) {

      var buffer = '';

      stream.on('data', function(chunk) {
        buffer += chunk.toString('utf8');
      });

      stream.on('end', function() {

        console.log(' * found, caching');
        packageData.unminified = buffer;
        Fiber(function() {
          packages.insert(packageData);
        }).run();

        resEnd(res, buffer);
        next();
      });
    
    } else {

      stream.on('end', next);

    }

    stream.resume();

  });

  https.get(build.build.url, function(res) {
    res.pipe(gunzip()).pipe(extract);
  });



});