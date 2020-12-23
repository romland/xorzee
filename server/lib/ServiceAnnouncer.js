"use strict";

const dbus = require('dbus-native');
const avahi= require('avahi-dbus');
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class ServiceAnnouncer
{
	constructor(conf)
	{
		this.conf = conf;
		this.bus =  dbus.systemBus();
	}

	start() 
	{
		let gotInterface = (err, iface) =>
		{
			iface.EntryGroupNew({
				destination: 'org.freedesktop.Avahi',
				path: '/',
				interface: 'org.freedesktop.Avahi.EntryGroupNew',
			}, gotEntryGroup);
		}

		let gotEntryGroup = (err, path) =>
		{
			this.bus.invoke({
				destination: 'org.freedesktop.Avahi',
				path: path,
				interface: 'org.freedesktop.Avahi.EntryGroup',
				member: 'AddService',
				body: [
					avahi.IF_UNSPEC,        // interface
					avahi.PROTO_UNSPEC,     // protocol
					0,                      // flags
					"Vidensi Jr.",                  // name
					"_" + this.conf.get("servicename") + "._tcp",      // type
					"local",               // domain
					"p19dev05.local",                // host -- not sure what this should be
					8080,                   // port
					[],                     // txt
				],
				signature: 'iiussssqaay'
			}, (err) => gotNewService(err, path) );
		}

		let gotNewService = (err, path) =>
		{
			this.bus.invoke({
				destination: 'org.freedesktop.Avahi',
				path: path,
				interface: 'org.freedesktop.Avahi.EntryGroup',
				member: 'Commit',
			}, done);
		}

		let done = (err) =>
		{
			if(err) {
				logger.error(err);
			}

			logger.info("Announcing service");
		}

		this.bus.getInterface('org.freedesktop.Avahi', '/', 'org.freedesktop.Avahi.Server', gotInterface)
	}

	stop()
	{
		logger.info("Stopping announcement");
		this.bus.connection.end();
	}

}

/*
let sa = new ServiceAnnouncer();
sa.start();
*/

exports.default = ServiceAnnouncer;

