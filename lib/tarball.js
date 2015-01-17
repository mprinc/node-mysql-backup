'use strict';

/* jshint node: true */

var cp   = require('child_process');
var path = require('path');
var fs     = require('fs');

/**
 * Create a gzipped tarball from a given folder.
 * @param {!string} outFile
 * @param {array} source
 * @param {!function(error, outputFile)} callback
 */
exports.create = function (outFile, encrypt, source, callback) {
	if (typeof encrypt === 'function') {
		callback = encrypt;
		encrypt = undefined;
	}

	if (typeof source === 'function') {
		callback = source;
		source = undefined;
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
			callback(err);
		}else{
			console.log("[lib/tarball.js:create] success creating tarball file: %s", tarballFile);
			if(typeof encrypt !== 'undefined'){
				var tarballFileEncrypted = tarballFile + (encrypt.extension ? encrypt.extension : ".zip");
				var cmd2 = "zip -P '" + encrypt.password + "' " + tarballFileEncrypted + " " + tarballFile;
				//console.log("[lib/tarball.js:create] success creating encrypted tarball file: %s", cmd2);
				cp.exec(cmd2, function (err) {
					if (err && !err.killed) {
						err = null;
					}

					if(err){
						console.log("[lib/tarball.js:create] error creating encrypted tarball file: %s", tarballFileEncrypted);
					}else{
						console.log("[lib/tarball.js:create] success creating encrypted tarball file: %s", tarballFileEncrypted);    	
					    fs.unlinkSync(tarballFile);
					}
					callback(err);
				});				
			}
		}
	});
};
