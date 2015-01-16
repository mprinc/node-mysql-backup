'use strict';

/* jshint node: true */

var cp   = require('child_process');
var path = require('path');

/**
 * Create a gzipped tarball from a given folder.
 * @param {!string} outFile
 * @param {array} source
 * @param {!function(error, outputFile)} callback
 */
exports.create = function (outFile, source, callback) {
  if (typeof source === 'function') {
    callback = source;
    source = false;
  }

  var tarballFile = '/tmp/' + outFile + '.tar.gz';
  console.log("[lib/tarball.js:create] tarball file: %s", tarballFile);
  // Mac osx reports unknown option error for this attribute: 
  //var cmd = 'tar --ignore-failed-read -zcf ' + tarballFile;
  var cmd = 'tar -zcf ' + tarballFile;
  if (source) {
    cmd += ' ' + source.join(' ');
  } else {
    cmd += ' -C /tmp ' + outFile + '/';
  }
  console.log("[lib/tarball.js:create] cmd: %s", cmd);

  cp.exec(cmd, function (err) {
    if (err && !err.killed) {
      err = null;
    }

    if(err){
    	console.log("[lib/tarball.js:create] error creating tarball file: %s", tarballFile);
    }else{
    	console.log("[lib/tarball.js:create] success creating tarball file: %s", tarballFile);    	
    }
    callback(err);
  });
};
