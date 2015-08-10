var logId = new ReactiveVar();

Template.generateBundle.helpers({
  logId: function() { return logId.get(); }
});

var genBundle = new Mongo.Collection('genBundle');

Template.generateBundle.onDestroyed(function() {
  if (this.observeHandle)
    this.observeHandle.stop();
});

Template.generateBundle.events({
  'click button': function(event, tpl) {
    var button = tpl.$('button');
    button.html('Generating...').attr('disabled', true);

    var packages = _.reject(tpl.$('textarea').val().split('\n'), function(val) {
      return val.match(/^#|^\s*$/);
    });
    var release = packages.shift();
    
    /*
    Meteor.call('genBundle', release, packages, function(error, data) {
      hash.set(data.hash);
      versions.set(data.versions);
      button.html('Generate').attr('disabled', false);
    });
    */

    if (tpl.subscribeHandle) tpl.subscribeHandle.stop();
    tpl.subscribeHandle = tpl.subscribe('genBundle', release, packages);

    tpl.observeHandle = genBundle.find().observe({
      added: function(doc) {
        if (doc._id === 'logId') {
          logId.set(doc.logId);
        } else {
          hash.set(doc.hash);
          versions.set(doc.versions);
          button.html('Generate').attr('disabled', false);
          tpl.subscribeHandle.stop();
          tpl.observeHandle.stop();
        }
      }
    });

    //Meteor.call('runMeteor', release, packages, function(error, data) {
    //  logId.set(data);
    //});
  }
});

var hash = new ReactiveVar();
var versions = new ReactiveVar();

Template.generateBundle.helpers({
  hash: function() { return hash.get(); },
  versions: function() { return versions.get(); }
});
