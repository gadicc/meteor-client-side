## client-side.meteor.com

Working, just use like this:

```html
<html>

  <head>
    <script src="/bundle.js?release=METEOR@1.1.0.2&deps=meteor-platform,gadicohen:famous-views"></script>
  </head>

</html>
```

Notes:

* You get a global var, `packageVersions`, which shows you what you got.
* You can specify explicit versions with `@=`
* Unless every package is specified with `@=`, you aren't guaranteed
  consistent versioning.  Browser will receive an etag for the sha.
* For consistency, use the DDP method / REST API to get the sha for your
  specific bundle (coming soon).  Browser will cache for 1 year.
* Use `bundle.js` instead of `bundle.min.js` to get the unminified version.

### TODO:

* caching
* minification
* DDP, pub for releases, packages
* method/rest for resolving
* sha for completely resolved package list
* adjust package db throttling
* cleanup

### Fail:

The original plan was for a format like this:

```html
<script src="http://csp.meteor.com/gadicohen:famous@1.2.0.min.js"></script>
```

But unfortunately we couldn't pre-wrap the files, since the imports depended
on the exports of the specific version of it's dependencies that were in the
bundle.

## Alternatives:

* https://github.com/frozeman/meteor-build-client - a tool to build the client part of a meteor app
* https://github.com/eface2face/meteor-client - core Meteor libraries as npm/browserify packages
* https://github.com/mondora/asteroid - custom front-end connector to Meteor backend
