## client-side.meteor.com

Apology: the code is quite messy, because I wanted this working as quickly as possible for very specific
use cases, and don't really expect anyone else to use it.  But if you'd like to look at nicer code,
open an issue on the repo and I'll clean it up :)

### Notes

* You get a global var, `packageVersions`, which shows you what you got.
* You can specify explicit versions with `@=`
* Unless every package is specified with `@=`, you aren't guaranteed
  consistent versioning, and browser will cache for 1 hr.
* If you do explicitly specify all versions, browser will receive an
  etag for the sha, and cache for 1 yr.
* Even if you specify all versions, they may have their own deps.  For
  guaranteed consistency, use the DDP method / REST API to get the sha
  for your specific bundle (coming soon).  ETag of sha + 1 yr cache.
* Use `bundle.js` instead of `bundle.min.js` to get the unminified version.

### TODO:

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
