var depsText = document.querySelector('script[type="text/meteor-deps"]')
  .text.split('\n');

var deps = [], releaseTrack, releaseVersion;

for (var i=0; i < depsText.length; i++) {
  if (depsText[i].length === 0 || depsText[i].match(/^\s*$/))
    continue;

  if (!releaseTrack) {
    var line = depsText[i].split('@');
    releaseTrack = line[0];
    releaseVersion = line[1];
  } else {
    deps.push(depsText[i]);
  }
}

console.log(releaseTrack);
console.log(releaseVersion);
console.log(deps);
