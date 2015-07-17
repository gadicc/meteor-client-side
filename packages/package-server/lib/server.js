pserver.meta = new Mongo.Collection('pserver_meta');

pserver.conn = DDP.connect("http://packages.meteor.com/");
//pserver.conn.onReconnect = doUpdate;

var DEBUG = false;

pserver.reset = function() {
  _.each(pserver._COLLECTION_NAMES, function(name) {
    pserver[name].remove({});
  });

  pserver.meta.remove('syncToken');
};

//pserver.reset();

function doUpdate() {
  var syncToken = pserver.meta.findOne('syncToken') || { format: "1.1" };
  if (syncToken._id) delete syncToken._id;
  console.log('Fetching...');

  var syncOpts = {};
  if (DEBUG)
    syncOpts.shortPagesForTest = true;

  pserver.conn.call('syncNewPackageData', syncToken, syncOpts, function(err, res) {

    if (DEBUG)
      console.log(res);

    if (res.resetData)
      pserver.reset();

    for (var colName in res.collections)
      for (var i=0; i < res.collections[colName].length; i++) {

        var doc = res.collections[colName][i];
        var newKey;

        for (var key in doc.dependencies) {
          if (key.match(/\./)) {
            newKey = key.replace(/\./g, '_DOT_');
            doc.dependencies[newKey] = doc.dependencies[key];
            delete doc.dependencies[key];
          }
        }

        try {
          pserver[colName].insert(doc);
        }
        catch (err) {
          console.log(err);
          console.log(doc);
        }

      }

    pserver.meta.upsert('syncToken', res.syncToken);

    if (res.upToDate)
      console.log('Packages up to date');
    else if (!DEBUG)
      Meteor.defer(doUpdate);
  });  
}

pserver.update = doUpdate;
