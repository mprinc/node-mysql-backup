#! /usr/bin/env /usr/local/bin/node
'use strict';

/* jshint node: true */

process.on('uncaughtException', fail);

var start   = +new Date();
var which   = process.argv[process.argv.length - 1];
var async   = require('async');
var moment  = require('moment');
var config  = require('../config');
var dropbox = require('../lib/dropbox-sync');
var mysql   = require('../lib/mysql-backup');
var tarball = require('../lib/tarball');
var clean   = require('../lib/clean');
var outFile = config.mysql[which].file_prefix + 'mysql-' + moment().format('YYYYMMDD-HHmmss');
var databases = config.mysql[which].databases;
var encrypt = config.mysql[which].encrypt;

async.series({
	connect: function (cb) {
		console.log("[bin/mysql-backup.js:showDatabases] connecting to dropbox");
		var connection = dropbox.connect({
			key: config.drivers.dropbox.key,
			secret: config.drivers.dropbox.secret
		});
		if(!connection) return null;

		console.log("[bin/mysql-backup.js:showDatabases] setting dropbox folder");
	    dropbox.setDirectory(config.mysql[which].directory);
	
		console.log("[bin/mysql-backup.js:showDatabases] connecting to DB server");
	    connection = mysql.connect({
	      host: config.mysql[which].hostname,
	      user: config.mysql[which].username,
	      password: config.mysql[which].password
	    });
	    if(!connection) return null;
	
	    cb();
	  },
  backup: mysql.backup.bind(mysql, outFile, databases),
  archive: tarball.create.bind(tarball, outFile, encrypt),
  sync: dropbox.send.bind(dropbox, outFile, encrypt),
  clean: clean.bind(clean, outFile, encrypt),
  cleanOld: dropbox.cleanOld.bind(dropbox, config.mysql[which].rotate)
}, function (err, args) {
  if (err) return fail(err);

  console.log('The MySQL backup has been completed successfully.\n');
  console.log('Backed up %d table(s) from %d database(s).\n', args.backup.tables, args.backup.databases);
  console.log('Total execution time: %d seconds', ((+new Date() - start) / 1000).toFixed(2));
  console.log('\nThe backup file has been saved to your Dropbox: %s (%s)', args.sync.path, args.sync.humanSize);
  process.exit(0);
});

function fail (err) {
  //clean && clean(outFile);

  console.error('The MySQL backup job has encountered a fatal error and could not continue.');
  console.error("\tError: %s", JSON.stringify(err));
  // http://stackoverflow.com/questions/10539201/how-to-output-a-deep-stack-trace-in-node-js
  // http://stackoverflow.com/questions/2923858/how-to-print-a-stack-trace-in-node-js
  if(typeof err.stack !== 'undefined') console.error(err.stack);
  process.exit(1);
}
