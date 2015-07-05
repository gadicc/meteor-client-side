pserver = packageServer = {};
pserver.COLLECTION_PREFIX = 'pserver_';
pserver._COLLECTION_NAMES = ['builds', 'packages', 'releaseTracks', 'releaseVersions', 'versions'];

_.each(pserver._COLLECTION_NAMES, function(name) {
  pserver[name] = new Mongo.Collection(pserver.COLLECTION_PREFIX + name);
});
