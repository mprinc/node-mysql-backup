'use strict';

/* jshint node: true */

var fs             = require('fs');
var mysql          = require('mysql');
var async          = require('async');
var child_process  = require('child_process');
var connection     = null;
var connectOptions = null;

/**
 * Create a new MySQL connection.
 * @param {!object} options
 * @return {mysql.connection}
 */
exports.connect = function (options) {
  connectOptions = options;
  connection = mysql.createConnection(options);

  console.log("Connecting to database");
  if(!connection){
	  console.error("Problem connecting to database");
  }

  return connection;
};

/**
 * Generate an SQL backup.
 * @param {!string} pathname
 * @param {!callable} done
 */
exports.backup = function (pathname, databases, done) {
  if (!connection) return;

  pathname = '/tmp/' + pathname;

  // Create the working directory
  try {
    fs.mkdirSync(pathname);
  } catch (err) {
    done(err, null);
  }

  var stats = { tables: 0, databases : 0 };

  var q = async.queue(function (task, callback) {
    switch (task.action) {
      case 'show_databases':
        showDatabases(pathname, q, stats, databases, callback);
        break;

      case 'create_database':
        showCreateDatabase(pathname, q, task, callback);
        break;

      case 'show_tables':
        showTablesInDatabase(q, task, stats, callback);
        break;

      case 'create_table':
        dumpTable(pathname, q, task, callback);
        break;
    }
  }, 6);

  // When the queue is finished processing, call our callback
  q.drain = function (err) {
    q.tasks = [];
    done(err, stats);
  };

  // Start by getting all of the databases
  q.push({ action: 'show_databases' });
};

/**
 * Restore a SQL backup. Not implemented.
 * @param {!string} pathname
 * @param {!callable} done
 */
exports.restore = function (pathname, callback) {
  if (!connection) callback(null);

  callback(pathname);
};

/**
 * Get a list of databases for the current server.
 * @param {!string} workingDir
 * @param {!async.queue} q
 * @param {!object} stats
 * @param {!function} callback
 */
var showDatabases = function (workingDir, q, stats, databases, callback) {
	if(databases){
		console.log("[lib/mysql-backup.js:showDatabases] databases: %s", JSON.stringify(databases));

		stats.databases += databases.length;

		databases.forEach(function (database) {
			if(typeof database.name === 'undefined'){
				
				var err = "Undefined database name in: " + JSON.stringify(database);
				// console.log(err);
				return q.drain(err);
			}
			var folder = workingDir + '/' + database.name;
			console.log("[lib/mysql-backup.js:showDatabases] for database: %s, creating folder: %s", JSON.stringify(database.name), folder);
			fs.mkdirSync(folder);
			if (fs.existsSync(folder)) {
				console.log("folder: %s exists", folder);
				q.push({ action: 'create_database', database: database });
				q.push({ action: 'show_tables', database: database });
			}else{
				console.error("Error creating folder: %s", folder);
				return;
			}
		});
		callback();
	}else{
		connection.query('SHOW DATABASES', function (err, databases) {
			if (err) {
				return q.drain(err);
			}
		
			stats.databases += databases.length;
			databases.forEach(function (database) {
				fs.mkdirSync(workingDir + '/' + database.Database);
				q.push({ action: 'create_database', database: {name: database.Database} });
				q.push({ action: 'show_tables', database: {name: database.Database} });
			});	
			callback();
		});
	}
};

/**
 * Get the SQL needed to create the current database.
 * @param {!string} workingDir
 * @param {!async.queue} q
 * @param {!object} task
 * @param {!function} callback
 */
var showCreateDatabase = function (workingDir, q, task, callback) {
	console.log("[lib/mysql-backup.js:showCreateDatabase] task.database.name: %s", JSON.stringify(task.database.name));
	if(typeof task.database.name === 'undefined'){
		
		var err = "Undefined database name in: " + JSON.stringify(task.database);
		// console.log(err);
		return q.drain(err);
	}
	connection.query('SHOW CREATE DATABASE `' + task.database.name + '`', function (err, sql) {
		if (err) {
			return q.drain(err);
		}

		//console.log("[lib/mysql-backup.js:showCreateDatabase] create %s: %s", JSON.stringify(task.database.name), sql[0]['Create Database']);
		fs.writeFileSync(workingDir + '/create_' + task.database.name + '.sql', sql[0]['Create Database']);
		callback();
	});
};

/**
 * Get a list of tables in the current database.
 * @param {!async.queue} q
 * @param {!object} task
 * @param {!object} stats
 * @param {!function} callback
 */
var showTablesInDatabase = function (q, task, stats, callback) {
	console.log("\t[lib/mysql-backup.js:showTablesInDatabase] task.database.name: %s", JSON.stringify(task.database.name));
	
	var tablesList = [];
	function createTasks(){
		stats.tables += tablesList.length;		
		console.log("\t[lib/mysql-backup.js:showTablesInDatabase] tables in task.database.name %s: %s = %s", 
				task.database.name, tablesList.length, JSON.stringify(tablesList));

		tablesList.forEach(function (table) {
			// console.log("\t[lib/mysql-backup.js:showTablesInDatabase] table: %s", table);
			q.push({
				action: 'create_table',
				database: task.database,
				table: table
			});
		});
		callback();
	}

	if(typeof task.database.tables === 'undefined' || task.database.tables === true){
		connection.query('SHOW TABLES FROM `' + task.database.name + '`', function (err, tables) {
			if (err) {
				return q.drain(err);
			}

			tables.forEach(function (table) {
				// console.log("\t[lib/mysql-backup.js:showTablesInDatabase] table: %s (%s)", table['Tables_in_' + task.database.name], JSON.stringify(table));
				tablesList.push(table['Tables_in_' + task.database.name]);
			});
			createTasks();
		});
	}else if(task.database.tables.constructor === Array){
		tablesList = task.database.tables;
		createTasks();
	}else{
		createTasks();
	}
};

/**
 * Get the SQL dump for the current table.
 * @param {!string} workingDir
 * @param {!async.queue} q
 * @param {!object} task
 * @param {!function} callback
 */
var dumpTable = function (workingDir, q, task, callback) {
	console.log("\t\t[lib/mysql-backup.js:dumpTable] table: %s in database: %s", task.table, task.database.name);
	//var cmdPath = 'mysqldump';
	var cmdPath = '/Applications/MAMP/Library/bin/mysqldump';
		
	var command = cmdPath +
		' --comments=FALSE' +
		' -u' + connectOptions.user +
		' -h ' + connectOptions.host +
		(connectOptions.password ? ' -p' + connectOptions.password : '') +
		' ' + task.database.name +
		' ' + task.table +
		' > "' + workingDir + '/' + task.database.name + '/' + task.table + '.sql"';

	// console.log("\t\t[lib/mysql-backup.js:dumpTable] command: %s", command);
	// http://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
	child_process.exec(command, function (error, stdout, stderr) {
		// console.log("\t\t[lib/mysql-backup.js:dumpTable] stdout: %s", stdout);
		if(error){
			console.log("\t\t[lib/mysql-backup.js:dumpTable] stdout: %s", stdout);
			console.error("\t\t\t[lib/mysql-backup.js:dumpTable] error (code:%s, signal:%s): %s", error.code, error.signal, error);
			console.error("\t\t\t[lib/mysql-backup.js:dumpTable] stderr: %s", stderr);
		}
		callback();			
	});
};
