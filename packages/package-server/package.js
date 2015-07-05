Package.describe({
  name: 'gadicohen:package-server',
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

  api.use(['mongo', 'underscore'], ['server', 'client']);
  api.use('ddp', 'server');

  api.addFiles('lib/common.js', [ 'client', 'server' ] );
  api.addFiles('lib/server.js', 'server');
  api.export('packageServer');
});

/*
Package.onTest(function(api) {
  api.use('tinytest');
  api.use('gadicohen:packages');
  api.addFiles('packages-tests.js');
});
*/