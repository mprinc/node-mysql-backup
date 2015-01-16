'use strict';

/* jshint node: true */

var fs     = require('fs');
var rimraf = require('rimraf');

/**
 * Remove the temporary source directory and the tarball archive.
 * @param {!string} outFile
 * @param {!function()} cb
 */
module.exports = function (outFile, encrypt, cb) {
	if (typeof encrypt === 'function') {
		callback = encrypt;
		encrypt = undefined;
	}

	if (fs.existsSync('/tmp/' + outFile)) {
		rimraf.sync('/tmp/' + outFile);
	}

	if (fs.existsSync('/tmp/' + outFile + '.tar.gz')) {
		fs.unlinkSync('/tmp/' + outFile + '.tar.gz');
	}
	if(encrypt){
		if (fs.existsSync('/tmp/' + outFile + '.tar.gz.zip')) {
			fs.unlinkSync('/tmp/' + outFile + '.tar.gz.zip');
		}
		if(encrypt.extension){
			if (fs.existsSync('/tmp/' + outFile + '.tar.gz' + encrypt.extension)) {
				fs.unlinkSync('/tmp/' + outFile + '.tar.gz' + encrypt.extension);
			}
		}
	}

	cb && cb();
}
