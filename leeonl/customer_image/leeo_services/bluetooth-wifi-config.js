var util = require('util');

var bleno = require('bleno');

var network = require('./network-utils');

var spawn = require('child_process').spawn;

//var sleep = require('sleep');

var fs = require('fs');

var exec = require( 'child_process' ).exec;

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;

console.log('bleno');

/************************************/
/*		Variables					*/
/************************************/

var serial = "12345ABCDAB";

if(fs.existsSync('/mnt/data/sn.txt')){
    var tempSerial = fs.readFileSync('/mnt/data/sn.txt').toString();
    if(tempSerial != "") {
        console.log("Serial: " + tempSerial);
        serial = tempSerial;
    }
}


var SSID = "";
var password = "";
var security = false;

var txUpdateCallBack = null;	//The callback to send stuff to the device

var messageQueue = []; //Queue of messages to send to the device


var wifiCharacteristic = null;

var BLEAPIVersion = "1";

var MAX_RETRIES = 10;
var retry_count = 0;

var bluetooth_process = null;

var accumulatedAndroidMessage = "";

var MAX_MSG_SIZE = 20; 
var HEADER_LEN = 4; 	//Number bytes for the header M00\t
var MAX_PACKET_LEN = MAX_MSG_SIZE - HEADER_LEN; 	//MAX_MSG_SIZE -  HEADER_LEN

/************************************/
/*		Public Methods				*/
/************************************/
//error_callback is called with no arguments if the process fails multiple times to
//start properly
exports.startWifiConfig = function startWifiConfig(error_callback)
{
    bluetooth_process = spawn('node', ['./bluetooth-wifi-config.js']);

    bluetooth_process.stdout.on('data', function (data) {
        if(data == 'on -> stateChange: unsupported\n' ||
                data == 'on -> stateChange: unauthorized\n'||
                data == 'on -> stateChange: poweredOff\n') {
            console.log("Unsupported stat");
            bluetooth_process.kill('SIGHUP');

            if(retry_count < MAX_RETRIES) {
                retry_count++;
                startWifiConfig(error_callback);
            } else {
                error_callback();
            }
        }
        console.log('stdout: ' + data);

    });

    bluetooth_process.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    bluetooth_process.on('close', function (code) {
        //TODO: Should restart the process if the user hasn't killed it
        console.log('child process exited with code ' + code);
    });
}

exports.stopWifiConfig = function stopWifiConfig()
{
    if(startWifiConfig != null) {
        bluetooth_process.kill('SIGHUP');
    }
}

/************************************/
/*		Handling Communication		*/
/************************************/
function processMessage(message)
{
    console.log("Received Message: \""+message+"\"");
    parts = message.toString().split("\t");

    //if(parts.lenth > 0) {
    var command = parts[0];
    console.log("Command: "+command);
    switch(command) {
    
    case "DN":
        //Setting Device number
        setDeviceNumber(parts[1]);
        break;
    
    case "S":
        //Setting the SSID
        if(parts.length > 1)
            SSID = parts[1];
        break;

    case "P":
        //Setting the password
        if(parts.length > 1) {
            if(parts[1] == "Yes")
                security = true;
            else
                security = false;    
            
                
        }
        password = parts[1];
        break;
    case "X":
        //Setting the password
        if(parts.length > 1)
            security = parts[1];
        break;

    case "NetworkConfigCompleted":
        console.log("network_config_completed");
        network.writeConfigFile(SSID,password,security);
        network.resetNetworkServices();
        break;

    case "ReqSerialNumber":
        sendMessage("N\t"+serial);
        break;
    case "ReqWifiStatus":
        network.checkWifiConnectedStatusViaDHCP(function callback(status){
            if(status)
                sendMessage("WS\tConnected");
            else
                sendMessage("WS\tNotConnected");
        });
        break;

    case "ReqWiFiScan":
        network.scanForAPs(sendAPList);
        break;

    case "ReqBLEAPIVersion":
        sendMessage("BLEAPIVER\t"+BLEAPIVersion);
        break;

    case "B":	//Pubnub channel
        setPubnubChannel(parts[1]);
        sendMessage("PubNubChanSet");
        break;

    case "T":
        setDeviceToken(parts[1]);
        break;

    case "PK":
        console.log("Setting publisher key: "+parts[1]);
        setPubnubPublisherKey(parts[1]);
        break;

    case "SK":
        console.log("Setting subscriber key: "+parts[1]);
        setPubnubSubscriberKey(parts[1]);
        break;

    case "ConfigCompleted":
        console.log("configuration_complete");
        /*
         * Moved this call to leeo-service.js. Leaving this in as a comment
         * in case we want to test via run_ble_config.js
         */
        //exec( '/bin/sh /usr/bin/software_update.sh', null );
        break;

    case "TZ":
        console.log("setting timezone");
        setTimezone(parts[1]);
        break;
        
    
    
    case "AM":
        console.log("Waiting for Android message");
        accumulatedAndroidMessage = "";
        break;
        
    case "M":
        console.log("Accumulating android message");
        accumulatedAndroidMessage = accumulatedAndroidMessage + parts[1];
        if(parts.length > 2){
            for(var i = 2; i<parts.length; ++i){
                accumulatedAndroidMessage = accumulatedAndroidMessage + "\t" + parts[i];
            }
        }
        break;
    
    case "EAM":
        console.log("Sending Android message: "+accumulatedAndroidMessage);
        processMessage(accumulatedAndroidMessage);
        break;
        
        

    default:
        break;
    }

    //} else {
    //	console.log("**Invalid Message: \""+message+"\" "+parts.length);
    //}
}

function sendMessage(message)
{
    console.log("Sending a message");
    if(wifiCharacteristic != null)
        wifiCharacteristic.txUpdateCallBack(new Buffer(message));
    //messageQueue.push(message);
    //wifiCharacteristic.txUpdateCallBack(new Buffer("MQ\t"+messageQueue.length));
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}


function sendAPList(apList) {

    var msg = "";
    console.log("sendAPList call back");
    for(i in apList) {
        if(i > 0) {
            msg += "\n";
        }
        msg += apList[i].ssid+","+apList[i].encryption_key+","+apList[i].quality;
    }


    var num_messages = Math.ceil(msg.length/MAX_PACKET_LEN);

    console.log("Size: "+num_messages+" for length of string "+msg.length);
    console.log(msg);

    sendMessage("AP\t"+msg.length+","+num_messages);

    for(i = 0; i < num_messages; i++ ) {
        var packet = "L" + pad(i, 2) +"\t"+ msg.substring(i*MAX_PACKET_LEN,i*MAX_PACKET_LEN+MAX_PACKET_LEN);
        //sendMessage(packet);
        wifiCharacteristic.txUpdateCallBack(new Buffer(packet));
        console.log("\n**"+packet +"**" );
        //sleep.sleep(1);

    }
    sendMessage("EAP");

}

function setPubnubChannel(channelId)
{
    fs.writeFile("/mnt/data/pubnub_channel.txt", channelId,{});
    console.log("Pubnub channel: "+channelId);
    console.log("pubnub_channel_set");
}

function setDeviceToken(dev_token)
{
    fs.writeFile("/mnt/data/dev_token.txt", dev_token,{});
    console.log("Dev token: "+dev_token);
    console.log("device_token_set");
}

function setPubnubPublisherKey(pub_key)
{
    fs.writeFile("/mnt/data/pub_pk.txt", pub_key,{});
}

function setPubnubSubscriberKey(sub_key)
{
    fs.writeFile("/mnt/data/pub_sk.txt", sub_key,{});
}

function setTimezone(tz)
{
    fs.writeFile("/mnt/data/tz.txt", tz,{});
}

function setDeviceNumber(dn)
{
    fs.writeFile("/mnt/data/device_id.txt", dn,{});
}

/************************************/
/*		Characteristic setup		*/
/************************************/

var WifiConfigCharacteristic = function() {
    WifiConfigCharacteristic.super_.call(this, {
        uuid: 'F000000000001000800000805F9B0001',
        properties: ['write','notify','read']
    });
};

util.inherits(WifiConfigCharacteristic, BlenoCharacteristic);

WifiConfigCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    console.log('WifiConfigCharacteristic write request: ' + data.toString('hex') + ' ' + offset + ' ' + withoutResponse);

    callback(this.RESULT_SUCCESS);
};



util.inherits(WifiConfigCharacteristic, BlenoCharacteristic);

WifiConfigCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    console.log('WifiConfigCharacteristic write request: ' + data.toString('hex') + ' ' + offset + ' ' + data);
    processMessage(data);
    callback(this.RESULT_SUCCESS);
};

//If a read attempt is made, send the serial number
WifiConfigCharacteristic.prototype.onReadRequest = function(offset, callback) {
    var result = this.RESULT_SUCCESS;	
    var data = new Buffer("N\t"+serial);
    callback(result, data);
};


WifiConfigCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
    console.log('NotifyOnlyCharacteristic subscribe');

    this.txUpdateCallBack = function(data) {
        console.log("Transmitting Number Message: "+data.toString())
        updateValueCallback(data);
    }.bind(this);
};

WifiConfigCharacteristic.prototype.onUnsubscribe = function() {
    console.log('NotifyOnlyCharacteristic unsubscribe');
    if (this.txUpdateCallBack != null) {
        this.txUpdateCallBack = null; 
    }
};

WifiConfigCharacteristic.prototype.onNotify = function() {
    console.log('NotifyOnlyCharacteristic on notify');
};


/************************************/
/*		Bleno setup and config		*/
/************************************/
wifiCharacteristic =  new WifiConfigCharacteristic();
function WifiService() {
    WifiService.super_.call(this, {
        uuid: 'F000000000001000800000805F9B0000',
        characteristics: [wifiCharacteristic]
    });
}

util.inherits(WifiService, BlenoPrimaryService);



bleno.on('stateChange', function(state) {
    console.log('on -> stateChange: ' + state);

    if (state === 'poweredOn') {
        bleno.startAdvertising('LeeoNL', ['F000000000001000800000805F9B0000']);
    } else {
        bleno.stopAdvertising();
    }
});

//Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
    console.log('on -> accept, client: ' + clientAddress);

    bleno.updateRssi();
});

bleno.on('disconnect', function(clientAddress) {
    console.log('on -> disconnect, client: ' + clientAddress);
});

bleno.on('rssiUpdate', function(rssi) {
    console.log('on -> rssiUpdate: ' + rssi);
});


bleno.on('advertisingStart', function(error) {
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

    if (!error) {
        bleno.setServices([
                           new WifiService()
                           ]);
    }
});

bleno.on('advertisingStop', function() {
    console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function() {
    console.log('on -> servicesSet');
});

