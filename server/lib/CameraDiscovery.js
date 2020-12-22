"use strict";

const { networkInterfaces } = require('os');
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const dbus = require('dbus-native');

// https://github.com/machinekoder/node-avahi-dbus
const avahi = require('avahi-dbus');

var ME;

class CameraDiscovery
{
	/*
	class scope
		this.browser
		this.daemon
	*/
	constructor(conf, onAdd, onRemove)
	{
		ME = this;
		ME.conf = conf;
		ME.onAdd = onAdd;
		ME.onRemove = onRemove;

		ME.myIps = this.getMyIpAddresses();

		let bus =  dbus.systemBus();
		ME.daemon = new avahi.Daemon(bus);

		ME.daemon.ServiceBrowserNew(
			avahi.IF_UNSPEC,
			avahi.PROTO_UNSPEC,
			'_mintymint._tcp',
			'local',
			0,
			ME.messageHandler
		);
	}

    getMyIpAddresses()
    {
        const nets = networkInterfaces();
        const results = [];

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                results.push(net.address);
            }
        }

        return results;
    }

	itemAdded(iface, protocol, name, type, domain, flags)
	{
		ME.daemon.ResolveService(
			iface,
			protocol,
			name,
			type,
			domain,
			avahi.PROTO_UNSPEC,
			0,
			(err, iface, protocol, name, type, domain, host, aprotocol, address, port, txt, flags) => {

				if(ME.myIps.includes(address)) {
					logger.debug("Neighbour found is actually myself; ignoring %s", address);
					return;
				}

				ME.onAdd(
					{
						event : "add",
						iface : iface,
						protocol : protocol,
						name : name,
						type : type,
						addressFamily : avahi.PROTO_UNSPEC,
						flags : 0,
						// resolved
						domain : domain,
						host : host,
						address : address,
						port : port,
						txt : txt,
						resolveFlags : flags
					}
				);
			}
		);

	}

	itemRemoved(iface, protocol, name, type, domain, flags)
	{
		// TODO: Ignore myself

		ME.onRemove(
			{
				event : "remove",
				iface : iface,
				protocol : protocol,
				name : name,
				type : type,
				domain : domain,
				flags : flags
			}
		);
	}

	messageHandler(err, browser)
	{
		ME.browser = browser;
		browser.on('ItemNew', ME.itemAdded);
		browser.on('ItemRemove', ME.itemRemoved);
	}
}
exports.default = CameraDiscovery;
