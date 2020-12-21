"use strict";

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
	constructor(onAdd, onRemove)
	{
		ME = this;
		ME.onAdd = onAdd;
		ME.onRemove = onRemove;

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

/*
new CameraDiscovery(
	(ob) => {
		console.log(ob);	// add
	},
	(ob) => {
		console.log(ob);	// remove
	}
);
*/
