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
		this.hostname = null;
		this.bus =  dbus.systemBus();
	}

	start() 
	{
		let gotInterface = (err, iface) =>
		{
			if(err) {
				logger.error("ServiceAnnouncer.gotInterface() error: %o", err);
			}

			iface.EntryGroupNew({
				destination: 'org.freedesktop.Avahi',
				path: '/',
				interface: 'org.freedesktop.Avahi.EntryGroupNew',
			}, gotEntryGroup);
		}

		let gotEntryGroup = (err, path) =>
		{
			if(err) {
				logger.error("ServiceAnnouncer.gotEntryGroup() error: %o", err);
			}

			this.bus.invoke({
				destination: 'org.freedesktop.Avahi',
				path: path,
				interface: 'org.freedesktop.Avahi.EntryGroup',
				member: 'AddService',
				body: [
					avahi.IF_UNSPEC,								// interface
					avahi.PROTO_UNSPEC,								// protocol
					0,												// flags
					"Vidensi Jr.",									// name
					"_" + this.conf.get("servicename") + "._tcp",	// type
					"local",										// domain
					this.hostname + ".local",						// host -- not sure what this should be
					8080,											// port
					[],												// txt
				],
				signature: 'iiussssqaay'
			}, (err) => gotNewService(err, path) );
		}

		let gotNewService = (err, path) =>
		{
			if(err) {
				logger.error("ServiceAnnouncer.gotoNewService() error: %o", err);
			}

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
				logger.error("ServiceAnnouncer.done() error: %o", err);
			}

			logger.info("Announcing service");
		}

		// Get hostname, then invoke announcing the service.
		this.bus.invoke({
			destination: 'org.freedesktop.Avahi',
			path: '/',
			interface: 'org.freedesktop.Avahi.Server',
			member: 'GetHostName'
		}, (err, hostname) => {
			if(err) {
				logger.error("ServiceAnnouncer.getHostName() error: %o", err);
			}

			this.hostname = hostname;
			logger.info("Hostname is %s", this.hostname);

			this.bus.getInterface('org.freedesktop.Avahi', '/', 'org.freedesktop.Avahi.Server', gotInterface)
		});

	}

	stop()
	{
		logger.info("Stopping announcement");
		this.bus.connection.end();
	}

}

exports.default = ServiceAnnouncer;
