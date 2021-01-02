<script>
	export let pos = "";
	export let sendMessage = null;
	export let settings = null;

	console.log(pos, sendMessage, settings);

/*
	let o = {};
	for(let s in settings) {
		o[s] = 	{
			"name" : s,
			"default" : settings[s],
			"current" : null,
			"description" : "",
		};
	}
	console.log(o);
*/

	const doc = {
		"name": {
			"category" : "",
			"name": "name",
			"default": "My Awesome Sensor",
			"current": null,
			"description": "Name of this device so you can uniquely identify it."
		},
		"password": {
			"category" : "",
			"name": "password",
			"default": "",
			"current": null,
			"description": "Password to access the stream and configuration."
		},
		"videoport": {
			"category" : "",
			"name": "videoport",
			"default": 8000,
			"current": null,
			"description": "Internal port, not accessible by browser. Should probably not change unless you really need to."
		},
		"motionport": {
			"category" : "",
			"name": "motionport",
			"default": 8001,
			"current": null,
			"description": "Internal port, not accessible by browser. Should probably not change unless you really need to."
		},
		"wwwport": {
			"category" : "",
			"name": "wwwport",
			"default": 8080,
			"current": null,
			"description": "Port on which website is hosted on."
		},
		"publicpath": {
			"category" : "",
			"name": "publicpath",
			"default": "/home/dev/tmp/streamtest/bettermotion/client/public",
			"current": null,
			"description": "The path where website is location."
		},
		"videowsport": {
			"category" : "",
			"name": "videowsport",
			"default": 8081,
			"current": null,
			"description": ""
		},
		"motionwsport": {
			"category" : "",
			"name": "motionwsport",
			"default": 8082,
			"current": null,
			"description": ""
		},
		"wsclientlimit": {
			"category" : "",
			"name": "wsclientlimit",
			"default": 100,
			"current": null,
			"description": ""
		},
		"onlyActivity": {
			"category" : "",
			"name": "onlyActivity",
			"default": true,
			"current": null,
			"description": ""
		},
		"servicename": {
			"category" : "",
			"name": "servicename",
			"default": "MintyMint",
			"current": null,
			"description": ""
		},
		"discovery": {
			"category" : "",
			"name": "discovery",
			"default": true,
			"current": null,
			"description": ""
		},
		"announce": {
			"category" : "",
			"name": "announce",
			"default": true,
			"current": null,
			"description": ""
		},
		"bitrate": {
			"category" : "",
			"name": "bitrate",
			"default": 1700000,
			"current": null,
			"description": ""
		},
		"framerate": {
			"category" : "",
			"name": "framerate",
			"default": 24,
			"current": null,
			"description": ""
		},
		"width": {
			"category" : "",
			"name": "width",
			"default": 1920,
			"current": null,
			"description": ""
		},
		"height": {
			"category" : "",
			"name": "height",
			"default": 1080,
			"current": null,
			"description": ""
		},
		"startupIgnore": {
			"category" : "",
			"name": "startupIgnore",
			"default": 600,
			"current": null,
			"description": ""
		},
		"ignoreArea": {
			"category" : "",
			"name": "ignoreArea",
			"default": [
			{
				"x": 1880.3179650238476,
				"y": 0
			},
			{
				"x": 1904.737678855326,
				"y": 24.419712716385686
			},
			{
				"x": 1880.3179650238476,
				"y": 0
			}
			],
			"current": null,
			"description": ""
		},
		"mayrecord": {
			"category" : "",
			"name": "mayrecord",
			"default": true,
			"current": null,
			"description": ""
		},
		"recordbuffersize": {
			"category" : "",
			"name": "recordbuffersize",
			"default": 3145728,
			"current": null,
			"description": ""
		},
		"recordpath": {
			"category" : "",
			"name": "recordpath",
			"default": "/home/dev/tmp/streamtest/bettermotion/client/public/clips",
			"current": null,
			"description": ""
		},
		"recordpathwww": {
			"category" : "",
			"name": "recordpathwww",
			"default": "/clips/",
			"current": null,
			"description": ""
		},
		"recordhistory": {
			"category" : "",
			"name": "recordhistory",
			"default": 20,
			"current": null,
			"description": ""
		},
		"trackReasons": {
			"category" : "",
			"name": "trackReasons",
			"default": true,
			"current": null,
			"description": ""
		},
		"simulateRecord": {
			"category" : "",
			"name": "simulateRecord",
			"default": true,
			"current": null,
			"description": ""
		},
		"startRecordRequirements": {
			"category" : "",
			"name": "startRecordRequirements",
			"default": {
			"activeTime": 2000,
			"minFrameMagnitude": 0,
			"minActiveBlocks": 20,
			"minInterval": 5000
			},
			"current": null,
			"description": ""
		},
		"stopRecordRequirements": {
			"category" : "",
			"name": "stopRecordRequirements",
			"default": {
			"stillTime": 3000,
			"maxFrameMagnitude": 0,
			"maxRecordTime": 60000,
			"minRecordTime": 0
			},
			"current": null,
			"description": ""
		},
		"signalRequirements": {
			"category" : "",
			"name": "signalRequirements",
			"default": {
			"sendDefaultSignals": true,
			"runAfterEvent": false,
			"minInterval": 10000,
			"executeScript": null
			},
			"current": null,
			"description": ""
		},
		"clusterEpsilon": {
			"category" : "",
			"name": "clusterEpsilon",
			"default": 2,
			"current": null,
			"description": ""
		},
		"clusterMinPoints": {
			"category" : "",
			"name": "clusterMinPoints",
			"default": 4,
			"current": null,
			"description": ""
		},
		"clusterDistancing": {
			"category" : "",
			"name": "clusterDistancing",
			"default": "Manhattan",
			"current": null,
			"description": ""
		},
		"preFilterLoners": {
			"category" : "",
			"name": "preFilterLoners",
			"default": false,
			"current": null,
			"description": ""
		},
		"discardInactiveAfter": {
			"category" : "",
			"name": "discardInactiveAfter",
			"default": 2000,
			"current": null,
			"description": ""
		},
		"vectorMinMagnitude": {
			"category" : "",
			"name": "vectorMinMagnitude",
			"default": 2,
			"current": null,
			"description": ""
		},
		"sendRaw": {
			"category" : "",
			"name": "sendRaw",
			"default": false,
			"current": null,
			"description": ""
		},
		"outputMotionCost": {
			"category" : "",
			"name": "outputMotionCost",
			"default": 100,
			"current": null,
			"description": ""
		}
	}
	

</script>

<div class="container">⚙ Settings</div>


<style>
	.container {
		position: absolute;
		top: 0;
		left: 0;
	}
</style>