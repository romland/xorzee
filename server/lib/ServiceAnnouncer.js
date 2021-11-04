"use strict";

const fs = require("fs");
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
		this.serialNumber = this.getSerialNumber();
		this.bus =  dbus.systemBus();

		logger.info("Serial number is %s", this.serialNumber);
	}

	getSerialNumber()
	{
		let cpuInfo = fs.readFileSync("/proc/cpuinfo", "utf8").split("\n");

		for(let i = 0; i < cpuInfo.length; i++) {
			if(cpuInfo[i].startsWith("Serial")) {
				let tuples = cpuInfo[i].split(": ");
				return tuples[1].trim();
			}
		}

		logger.error(
			"Failed to get serial number. This will likely mean service announcements will fail if there are multiple cameras"
		);

		return "";
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
					"Xorzee-" + this.serialNumber,					// name
					"_" + this.conf.get("serviceName") + "._tcp",	// type
					"local",										// domain
					this.hostname + ".local",						// host -- not sure what this should be
					this.conf.get("motionWsPort"),					// port for getting settings
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

			logger.debug("Announcing service");
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
			logger.debug("Hostname is %s", this.hostname);

			this.bus.getInterface('org.freedesktop.Avahi', '/', 'org.freedesktop.Avahi.Server', gotInterface)
		});

	}

	stop()
	{
		logger.debug("Stopping announcement");
		this.bus.connection.end();
	}

}

exports.default = ServiceAnnouncer;
