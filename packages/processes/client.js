ProcessCol = new Mongo.Collection('Process');
ProcessLogs = new Mongo.Collection('ProcessLogs');

window.pc = ProcessCol;
window.pl = ProcessLogs;

Template.processLog.onCreated(function() {
  var self = this;
  self.autorun(function() {
    var data = Template.currentData();
    if (data.id)
      self.subscribe("Process", data.id);
  });
});

Template.processLog.helpers({
  process: function() { return ProcessCol.findOne(this.id); },
  chunks: function() { return ProcessLogs.find({ p: this.id }, { sort: { o: 1 }} ); },
  chunk: function(c) {
    scrollDown(Template.instance());
    // XXX escape script tags? etc?
    return ansi_up.ansi_to_html(ansi_up.escape_for_html(this.c));
  }
});

var scrollDown = _.debounce(function(tpl) {
  var div = tpl.$('.processLog');
  div.scrollTop(div.prop('scrollHeight'));
}, 50);

/*
var logId = new ReactiveVar();

Template.body.helpers({
  logId: function() { return logId.get(); }
});

Meteor.call('logStart', function(err, data) {
  logId.set(data);
});
*/
