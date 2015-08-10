Package.describe({
  name: 'gadicohen:processes',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  api.use('jakozaur:ansi-up@1.1.2_2', ['server', 'client']);

  api.use('mongo', 'server');
  api.addFiles('processes.js', 'server');

  api.use(['mongo','templating', 'underscore', 'reactive-var'], 'client');
  api.addFiles(['client.html', 'client.js', 'client.css'], 'client');

  api.export('Process', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('processes');
  api.addFiles('processes-tests.js');
});
