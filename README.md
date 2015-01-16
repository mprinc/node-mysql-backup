Node Backup
===========

This project is designed to provide a cloud backup service for use on desktops or servers, built in Node.js.
Backup can be **encrypted** so you do not need to rely on trust of public cloud storage services.
You can select which databases and tables you want to backup, not necessarily the whole database server.

**WARNING:** this is alpha software, not fully tested but with relatively solid log report what is going on in the system
that together with integration with crond that will send you that log report nicely in mail should work pretty fine.

Feel free to look around though.
(This tool is extension of tool done by [Brandon Wamboldt (node-mysql-backup)](https://github.com/brandonwamboldt/nodebackup).)

Planned Features
----------------

* Support for multiple cloud storage backends
    * ~~Dropbox~~
    * Google Drive
    * AWS
* MySQL support
    * ~~Backups~~
    * Restore
* Filesystem support
    * ~~Backups~~
    * Restore
    * ~~Include multiple folders~~
* PostGreSQL support
    * Backups
    * Restore
* MongoDB support
    * Backups
    * Restore

Installation
------------

1. Run `npm install` to install package dependencies
2. Copy `config.json.example` to `config.json` and fill out the appropriate values (namely your cloud storage parameters)
3. Generate an oAuth token using `bin/oauth-auth` (not implemented yet, you need to create token in dropbox, online in your app)

Syntax Examples
---------------

```
/opt/nodebackup/bin/mysql-backup nightly
```

You can define multiple configurations for each supported system (filesystem, mysql, postgre, etc), 
and select which to run via the command line.