/*
 * This module handles messages from multiple sources. Specifically:
 *  1. PubNub messages - transient control messages, real time streaming
 *  2. Sensor readings - This module instantiates a domain socket server,
 *     sensor readings are posted in JSON format, we have to parse them
 *     to make necessary FSM adjustments and send off to interested parties
 *     (pubnub or backend server).
 *  3. Backend server messages - TBD
 */

var HOSTSERVER = 'http://staging.leeo.com';
var HOSTPORT = "";
var HOSTPATH = '/api/devices/';


var request = require('request');
var smoke_alarm_handler = require('./microphone/alarm_handler.js').AlarmHandler;
var device_fsm = require('./device_fsm.js').DeviceFsm;

var logger = require("./logger.js").logger;

var fs = require('fs');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var pubnubConfigFile = '/mnt/data/pubnub_channel.txt';
var alsConfigFile = '/mnt/data/config/als_status';
var pirConfigFile = '/mnt/data/config/pir_status';
var tokenFile = "/mnt/data/dev_token.txt";
var idFile = "/mnt/data/device_id.txt";
var snFile = "/mnt/data/sn.txt";

var pubnub_publish_key = "pub-c-d5159a35-e09b-4175-b5ad-8a5a49247b34";
var pubnub_subscribe_key = "sub-c-98373340-23c8-11e3-bcf5-02ee2ddab7fe";

var deviceChannel = "streaming-12345678";
var updateProcess = null;
var pubnub;

if (fs.existsSync(snFile)) {
    var tmp = fs.readFileSync(snFile).toString();
    if(tmp != "") {
        deviceChannel = tmp.trim();
    }
}


function CollectPubnubCredentials(){
    if (fs.existsSync('/mnt/data/pub_pk.txt')) {
    	var tmp = fs.readFileSync('/mnt/data/pub_pk.txt').toString();
    	if(tmp != "") {
    		pubnub_publish_key = tmp.trim();
    	}
    } else {
        var tmp = fs.readFileSync('pub_pk.cfg').toString();
        if(tmp != "") {
            pubnub_publish_key = tmp.trim();
        }
    }
    
    if (fs.existsSync('/mnt/data/pub_sk.txt')) {
    	var tmp = fs.readFileSync('/mnt/data/pub_sk.txt').toString();
    	if(tmp != "") {
    		pubnub_subscribe_key = tmp.trim();
    	}
    } else {
        var tmp = fs.readFileSync('pub_sk.cfg').toString();
        if(tmp != "") {
            pubnub_subscribe_key = tmp.trim();
        }
    }
    
    if (fs.existsSync(pubnubConfigFile)) {
        var tmp = fs.readFileSync(pubnubConfigFile).toString();
        if(tmp != "") {
            deviceChannel = tmp.trim();
        }
    }
}

function PubnubHandlers(){
    this.handlerArray = {};
};

PubnubHandlers.prototype.processStreamStart = function (message){
    logger.log("info", "************** Starting stream");
    logger.log("info", "    Recipient:", messageRouter.pubnubPublishMode);
    messageRouter.pubnubPublishMode = message['sensors'];
};

PubnubHandlers.prototype.processStreamStop = function (message){
    logger.log("info", "**************: Stopping stream");
    messageRouter.pubnubPublishMode = ["None"];
};

PubnubHandlers.prototype.lightControl = function (message){
    device_fsm.handle("changeLightColorTo", message['rgb']);
};

PubnubHandlers.prototype.issueWarning = function (message){
    device_fsm.handle("issueWarning",message['sensor_type']);
};

PubnubHandlers.prototype.clearWarning = function (message){
    device_fsm.handle("clearWarning",message['sensor_type']);
};

PubnubHandlers.prototype.issueDanger = function (message){
    device_fsm.handle("issueDanger",message['sensor_type']);
};

PubnubHandlers.prototype.clearDanger = function (message){
    device_fsm.handle("clearDanger",message['sensor_type']);
};

PubnubHandlers.prototype.recordAudioAlarm = function (message){
    var failedCallback = function(error) {
        logger.log("Failed to grab url! " + error);
    };

    var sendCallback = function(url) {
        logger.log("successfully grabbed URL");
        smoke_alarm_handler.send();
    };
    var successCallback = function() {

        exec('service jackd restart',
            function (error, stdout, stderr) {
                if (error) {
                    logger.log('[Error] restarting jackd.', error);
                } else {
                    logger.log('Restarted jackd');
                }
            }
        );
        exec('service jack-leeo-client restart',
            function (error, stdout, stderr) {
                if (error) {
                    logger.log('[Error] restarting jack-leeo-client.', error);
                } else {
                    logger.log('Restarted jack-leeo-client');
                }
            }
        );
        logger.log("Successfully recorded!");
        smoke_alarm_handler.getURL(sendCallback, failedCallback);
    };

    exec('service jack-leeo-client stop',
        function (error, stdout, stderr) {
            if (error) {
                logger.log('[Error] restarting jack-leeo-client.', error);
            } else {
                logger.log('Restarted jack-leeo-client');
            }
        }
    );

    smoke_alarm_handler.record(message['sensor_type'], successCallback);
};

PubnubHandlers.prototype.enableAls = function (message){
    logger.log("Enabling ALS");
    device_fsm.toggleAls(true);
    fs.writeFile(alsConfigFile,'1', function(err){
        if(err){
            logger.log("error","ALS config file unavailable: "+alsConfigFile);
        }
    });
};

PubnubHandlers.prototype.disableAls = function (message){
    logger.log("Disabling ALS");
    device_fsm.toggleAls(false);
    fs.writeFile(alsConfigFile,'0', function(err){
        if(err){
            logger.log("error","ALS config file unavailable: "+alsConfigFile);
        }
    });
};

PubnubHandlers.prototype.enablePir = function (message){
    logger.log("Enabling PIR");
    device_fsm.togglePir(true);
    fs.writeFile(pirConfigFile,'1', function(err){
        if(err){
            logger.log("error","PIR config file unavailable: "+pirConfigFile);
        }
    });
};

PubnubHandlers.prototype.disablePir = function (message){
    logger.log("Disabling PIR");
    device_fsm.togglePir(false);
    fs.writeFile(pirConfigFile,'0', function(err){
        if(err){
            logger.log("error","PIR config file unavailable: "+pirConfigFile);
        }
    });
};

function getLeeoVersion(callback){
    exec( '/usr/bin/apt-cache policy leeonl', function( error, stdout, stderr ){ 
    //exec( 'cat /mnt/data/config/sw_version', function( error, stdout, stderr ){ 
            var rePattern = new RegExp(/.*Installed: (.*)\n.*/);
            var arrMatches = stdout.match(rePattern);
            if(arrMatches){
                version = arrMatches[1];
                callback(version);
            }
            else{
                callback("");
            }
    });
};

PubnubHandlers.prototype.sendLeeoNlVersion = function(message){
    getLeeoVersion(function(version){
        if (version){
            var message = JSON.stringify({
                type: "info",
                version: version
            });
            pubnub.publish({
                channel: deviceChannel,
                message: message,
                callback: function (e) {
                    logger.log("info", "    Status: Success!", e);
                },
                error: function (e) {
                    console.error("    SendLeeoNlVersion Status: Error!", e);
                }
            });
        }
    });
};

PubnubHandlers.prototype.sendConnectedMsg = function(message){
    var message = JSON.stringify({
        type: "info",
        connected: "yes"
    });
    pubnub.publish({
        channel: deviceChannel,
        message: message,
        callback: function (e) {
            logger.log("info", "    Status: Success!", e);
        },
        error: function (e) {
            logger.error("    SendConnectedMsg Status: Error!", e);
        }
    });
};

PubnubHandlers.prototype.fetchUpdate = function(message){
    logger.log("info","Fetching update");
     var out = fs.openSync('/dev/null', 'a'),
         err = fs.openSync('/dev/null', 'a');
    updateProcess = spawn('/bin/sh', ['/usr/bin/software_update.sh'],{
        detached: true,
        stdio: [ 'ignore', out, err ]
    });
    updateProcess.unref();
};

PubnubHandlers.prototype.configComplete = function(message){
    device_fsm.transition("rainbow");
};



PubnubHandlers.prototype.registerHandlers = function(){
    var self = this;
    self.handlerArray["start-streaming"] = this.processStreamStart;
    self.handlerArray["stop-streaming"] = this.processStreamStop;
    self.handlerArray["light-control"] = this.lightControl;
    self.handlerArray["issue-warning"] = this.issueWarning;
    self.handlerArray["clear-warning"] = this.clearWarning;
    self.handlerArray["issue-danger"] = this.issueDanger;;
    self.handlerArray["clear-danger"] = this.clearDanger;
    self.handlerArray["record-alarm"] = this.recordAudioAlarm;
    self.handlerArray["als-enabled"] = this.enableAls;
    self.handlerArray["als-disabled"] = this.disableAls;
    self.handlerArray["pir-enabled"] = this.enablePir;
    self.handlerArray["pir-disabled"] = this.disablePir;
    self.handlerArray["get-version"] = this.sendLeeoNlVersion;
    self.handlerArray["get-connected-status"] = this.sendConnectedMsg;
    self.handlerArray["fetch-update"] = this.fetchUpdate;
    self.handlerArray["config-complete"] = this.configComplete;

};

PubnubHandlers.prototype.processMessage = function(message){
    var self = this;
    var name = message["type"];

    if (!name) {
        name = JSON.parse(message)["type"];
    }

    logger.log("info","new pubnub message: " + name);
    if(name in self.handlerArray){
        self.handlerArray[name](message);
    }
    else{
        logger.log("error", "ProcessMessage No handler for message: " + name);
    }
};

function MessageRouter() {
    this.simulatorMode = false;
    this.pubnubPublishMode = ["None"];
    this.messageHandlers = {};
    this.sensorsock="/var/run/leeo/sensors.sock";
    this.deviceChannel = "12345678-streaming";
};

MessageRouter.prototype.sendConnectedMessage = function(){
    pubnubHandlers.sendConnectedMsg(null);
};

MessageRouter.prototype.subscribeToPubnub = function () {
    var self = this;
    CollectPubnubCredentials();
    pubnub = require('pubnub').init({
        publish_key: pubnub_publish_key,
        subscribe_key: pubnub_subscribe_key
    });
    logger.log("info", "PUBNUB **** Subscribing to channel");
    var handler = MessageRouter.prototype.receiveMessage;

    logger.log("info", "Channel:"+deviceChannel);
    pubnub.subscribe({
        channel: deviceChannel,
        callback: handler
    });
    self.sendConnectedMessage();

};



// FIXME: Not using sockets anymore. Delete this when all sensors are
// communicating in their final form
MessageRouter.prototype.createSensorSocket = function(){
    var self = this;
    var net = require('net');
    var fs = require('fs');
    self.server = net.createServer(function(c) { //'connection' listener
        logger.log("info",'server connected');
        c.on('end', function() {
            logger.log("info",'server disconnected');
        });
        c.write('hello\r\n');
        c.on("data", function(data){
            /* FIXME: This is the message router routine.
             * Data will be written in JSON format, parse 
             * sensor name and data, save to file, update FSM
             */
            logger.log("info","data: "+ data.toString());
        });
    });
    
    self.server.on('error', function (e) {
        logger.log("error", e.code);
        if (e.code == 'EADDRINUSE') {
            fs.unlinkSync(self.sensorsock);
            self.server.listen(self.sensorsock, function() { //'listening' listener
                logger.log("info",'Socket reused');
            });
        }
        else{
            logger.log("info","Unhandled error when trying to create sensor socket: " +e.code);
        }
    });
    
    self.server.listen(self.sensorsock, function() { //'listening' listener
        logger.log("info",'server bound');
    });
};

MessageRouter.prototype.unlink = function(){
    var self=this;
    var fs = require('fs');
    fs.unlinkSync(self.sensorsock);
};

MessageRouter.prototype.publishToPubnub = function (message, sensor_name) {
    var self = this;
    if (messageRouter.pubnubPublishMode.indexOf(sensor_name) > -1) {
        pubnub.publish({
            channel: deviceChannel,
            message: message,
            callback: function (e) {
                logger.log("info", "    PublishToPubnub Status: Success!", e);
            },
            error: function (e) {
                console.error("    PublishToPubnub Status: Error!", e);
            }
        });
    } else {
    }
};

MessageRouter.prototype.receiveMessage = function (message) {
    pubnubHandlers.processMessage(message);  
};


// Ships the sensor data reading off to the webserver
MessageRouter.prototype.sendSensorReading = function (sensorReadingValue, sensor, callback) {
    var sensorName = sensor['sensor_name'];
    var currentReadingTime = Math.round(new Date().getTime() / 1000);

    var self = this;
    sensorReadingValue = String(sensorReadingValue);

    var postData = JSON.stringify({
        serial_number: deviceChannel,
        sensor_data: {
            value: sensorReadingValue,
            time: currentReadingTime,
            type: sensorName
        }
    });

    var message = JSON.stringify({
        type: "streaming",
        sensor_data: {
            value: sensorReadingValue,
            time: currentReadingTime,
            type: sensorName
        }
    });

    MessageRouter.prototype.publishToPubnub(message, sensorName);

    request.post({
            uri: HOSTSERVER + HOSTPORT + HOSTPATH,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
                'Accept': 'application/vnd.leeo-v1+json'
            },
            body: postData
        },
        function (error, response, body) {
            try {
                if (response) {
                    if (response.statusCode === 200) {
                        callback(response.statusCode);
                    } else if (response.statusCode === 500) {
                        if (g_simulatorMode) {
                            throw new Error();
                        }

                        callback(response.statusCode, "Unsuccessful POST");
                    } else {
                        callback(response.statusCode, "Unsuccessful POST");
                    }
                } else {
                    logger.log("info", "No response from the server");
                }
                if (error) {
                    logger.log("info", "Error in Post", error);
                }
            } catch (e) {
                //logger.log("info", "** SOURCE ** Got an exception while fetching response for POST", e)
            }
        });
};

MessageRouter.prototype.putDeviceConfig = function(){
    var self = this;
    var versionNo = "";
    var token = "";
    var id = "";
    var serial = "";
    getLeeoVersion(function(res){
        if (res){
            versionNo = res.trim();
        }
        else{
        }
        if (fs.existsSync(tokenFile)) {
            var tmp = fs.readFileSync(tokenFile).toString();
            if(tmp != "") {
                token = tmp.trim();
            }
        }
        if (fs.existsSync(idFile)) {
            var tmp = fs.readFileSync(idFile).toString();
            if(tmp != "") {
                id = tmp.trim();
            }
        }
        
        if (fs.existsSync(snFile)) {
            var tmp = fs.readFileSync(snFile).toString();
            if(tmp != "") {
                serial = tmp.trim();;
            }
        }
        console.log("version: " + versionNo + " token: " + token + " id: " +id);
        
        var putData = JSON.stringify({
            version: versionNo,
            serial_number: serial
        });
        var putUri = HOSTSERVER + HOSTPORT + HOSTPATH + id+ ".json"
        console.log("putUri: " + putUri);
        request.put({
            uri: putUri,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': putData.length,
                'Accept': 'application/vnd.leeo-v1+json',
                'X-Api-Auth-Token' : token
            },
            body: putData
        },
        function (error, response, body) {
            console.log("body of response: " +body);
            try {
                if (response) {
                    if (response.statusCode === 200) {
                        callback(response.statusCode);
                    } else if (response.statusCode === 500) {
                        if (g_simulatorMode) {
                            throw new Error();
                        }

                        callback(response.statusCode, "Unsuccessful PUT");
                    } else {
                        callback(response.statusCode, "Unsuccessful PUT");
                    }
                } else {
                    logger.log("info", "No response from the server");
                }
                if (error) {
                    logger.log("info", "Error in Put", error);
                }
            } catch (e) {
                //logger.log("info", "** SOURCE ** Got an exception while fetching response for POST", e)
            }
        });
    });

};

var pubnubHandlers =  pubnubHandlers || new PubnubHandlers();
pubnubHandlers.registerHandlers();
module.exports.PubnubHandlers = pubnubHandlers;
var messageRouter = messageRouter || new MessageRouter();
module.exports.MessageRouter = messageRouter;





