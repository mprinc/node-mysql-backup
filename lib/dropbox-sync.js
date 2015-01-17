'use strict';

/* jshint node: true */

var Dropbox = require('dropbox');
var fs      = require('fs');
var os      = require('os');
var client  = null;
var folder  = null;

/**
 * Create a new Dropbox Client with the given credentials as well as the cached
 * oAuth token.
 * @param {!object] options
 * @return {Dropbox.Client}
 */
exports.connect = function (options) {
	console.log("Connecting to dropbox");
	var file = __dirname + '/../.oauth-token';
	if (fs.existsSync(file)) {
		  options.token = fs.readFileSync(file).toString('UTF-8').trim();
		  client = new Dropbox.Client(options);
	}else{
		console.error("Dropbox oauth token file is missing: %s", file);
	}

  return client;
};

/**
 * Set the name of the directory to store files in.
 * @param {!string} prefix
 */
exports.setDirectory = function (prefix) {
	folder = prefix;
	console.log("[lib/dropbox-sync.js:setDirectory] folder:%s", folder);
};

/**
 * Transmit a file to Dropbox.
 * @param {!string} localFile
 * @param {!function(err, response)} callback
 */
exports.send = function (localFile, encrypt, callback) {
	if (typeof encrypt === 'function') {
		callback = encrypt;
		encrypt = undefined;
	}

	var remoteFile = '/' + os.hostname() + '/' + folder + '/' + localFile + '.tar.gz';
	var localFileFull = '/tmp/' + localFile + '.tar.gz';
	if(encrypt){
		remoteFile += encrypt.extension ? encrypt.extension : ".zip";
		localFileFull += localFileFull ? encrypt.extension : ".zip";
	}

	fs.open(localFileFull, 'r', function (err, fd) {
		if(err){
			callback(err);
		}
		var stats     = fs.fstatSync(fd);
		var chunkSize = 1024 * 1024; // 1 MB
		var chunks    = Math.ceil(stats.size / (1024 * 1024));
		var chunk     = 0;

		function next (err, cursor) {
			if (chunk < chunks) {
				var buffer = new Buffer(Math.min(stats.size, chunkSize));
				var length = Math.min(stats.size - (chunk * chunkSize), chunkSize);
				var offset = chunk * chunkSize;
				chunk++;

				fs.readSync(fd, buffer, 0, length, offset);
				client.resumableUploadStep(buffer, cursor, next);
			} else {
				client.resumableUploadFinish(remoteFile, cursor, callback);
			}
		}

		next(null, false);
	});
};

/**
 * Remove old files that exceed the number of backups to keep.
 * @param {!integer} max
 * @param {!function(err, filesRemoved)} callback
 */
exports.cleanOld = function (max, callback) {
  var remoteDir = '/' + os.hostname() + '/' + folder;

  client.readdir(remoteDir, function (err, files) {
    // If we haven't hit the file limit, do nothing
    if (files.length < max || err) {
      callback(err, []);
    }

    // Sort by file name
    files = files.sort(function (a, b) { return a > b ? 1 : -1 });

    // How many do we need to remove?
    files = files.slice(0, files.length - max);

    // Keep track of our callbacks
    var asyncCounter = 0;

    // Remove them
    files.forEach(function (f) {
      client.unlink(remoteDir + '/' + f, function () {
        asyncCounter++;

        if (asyncCounter >= files.length) {
          callback(err, files);
        }
      });
    });
  });
};
