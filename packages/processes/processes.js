var child_process = Npm.require('child_process');
var Fiber = Npm.require('fibers');

ProcessCol = new Mongo.Collection('Process');
ProcessLogs = new Mongo.Collection('ProcessLogs');

const STDIN = 0;
const STDOUT = 1;
const STDERR = 2;

Process = function(command, args, options) {
  var self = this;
  this.process = child_process.spawn(command, args, options);
  this.state = 'running';
  this.lastChunks = {};
  this.lastChunks[STDOUT] = 0;
  this.lastChunks[STDERR] = 0;

  this._id = ProcessCol.insert({
    command: command,
    args: args,
    options: options,
    state: this.state,
    ctime: new Date()
  });

  this.process.stdout.on('data', function (data) {
    self.log(data, STDOUT);
  });

  this.process.stderr.on('data', function (data) {
    self.log(data, STDERR);
  });

  this.process.on('close', function (code) {
    Fiber(function() {
      ProcessCol.update(self._id, { $set: {
        state: code ? 'errored' : 'finished',
        exitCode: code,
        mtime: new Date()
      }});
    }).run();
  });
}

Process.prototype.log = function (chunk, fd) {

  var self = this;
  Fiber(function() {

    chunk = chunk.toString('utf8');

    if (chunk.match(/^\r/)) {

      // TODO, handle \n in middle of chunk
      ProcessLogs.update({
        p: self._id,
        o: self.lastChunks[fd],
        f: fd
      }, { $set: {
        c: chunk.replace(/^\r/, '')
      }});

    } else {

      ProcessLogs.insert({
        p: self._id,
        o: ++self.lastChunks[fd],
        f: fd,
        c: chunk
      });

    }

  }).run();

}

// TODO, security
Meteor.publish('Process', function(id) {
  return [
    ProcessCol.find(id),
    ProcessLogs.find({ p: id })
  ]
});

/*
Meteor.methods({
  logStart: function() {
    return new Process('/home/dragon/tmp/log')._id;
  }
});
*/