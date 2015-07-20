Template.generateBundle.events({
  'click button': function(event, tpl) {
    var button = tpl.$('button');
    button.html('Generating...').attr('disabled', true);

    var packages = _.reject(tpl.$('textarea').val().split('\n'), function(val) {
      return val.match(/^#|^\s*$/);
    });
    var release = packages.shift();
    
    Meteor.call('genBundle', release, packages, function(error, data) {

      hash.set(data.hash);
      versions.set(data.versions);
      button.html('Generate').attr('disabled', false);

    });
  }
});

var hash = new ReactiveVar();
var versions = new ReactiveVar();

Template.generateBundle.helpers({
  hash: function() { return hash.get(); },
  versions: function() { return versions.get(); }
});
