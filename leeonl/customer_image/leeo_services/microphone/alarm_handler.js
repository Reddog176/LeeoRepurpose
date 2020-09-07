var exec = require('child_process').exec;
var logger = require("../logger.js").logger;

var WAV_FILE = "smoke_alarm_recording.wav",
    HOSTSERVER = 'http://staging.leeo.com/api',
    HOSTPATH = "/storage/alarm";

var fs = require('fs');
var request = require('request');
var FormData = require('form-data');
var pubnubConfigFile = '/mnt/data/pubnub_channel.txt';
var tokenConfigFile = '/mnt/data/dev_token.txt';
var deviceIdFile = '/mnt/data/device_id.txt';

var getConfig = function(file) {
    var self = this;
    fs.readFile(file, function read(err, data) {
        if (err) {
            console.log("Error reading pubnub config file: " + file);
        }
        else{
            return data.toString().trim();
        }
    });
}

var device_channel = getConfig(pubnubConfigFile);
var device_token = getConfig(tokenConfigFile);
var device_id = getConfig(deviceIdFile);

function AlarmHandler() {
    // TODO: this is grabbed from response to /data/sound
    this.soundURL = "http://staging.leeo.com/api/someurl";
    this.form = new FormData();
};

AlarmHandler.prototype.record = function (sensor_type, callback) {
    console.log("Record");
    exec('/usr/local/bin/jack_rec -f microphone/smoke_alarm_recording.wav -d 20 -b 8000 system:capture_1',
        function (error, stdout, stderr) {
            if (error) {
                console.log('[Error] in recording sound with jack_rec.', error);
            }
            else {

                fs.exists('microphone/smoke_alarm_recording.wav', function (exists) {
                    if (exists) {
                        console.log("Successfully generated smoke_alarm");
                        callback("success");
                    }
                });


            }
        }
    );
};

AlarmHandler.prototype.getURL = function (successCallback, failCallback) {

    var currentTime = Math.round(new Date().getTime() / 1000);

    request.post({
            uri: HOSTSERVER + HOSTPATH + "?device_id=" + device_id,
            headers: {
                'User-Agent': 'Leeonl beta (quanta)',
                'X-Api-Auth-Token': device_token
            }
        }, function (error, response, body) {
            try {
                if (response) {
                    if (response.statusCode === 200) {

                        this.soundURL = body['signed_url'];
                        successCallback(this.soundURL);
                    } else if (response.statusCode === 500) {
                        failCallback("Unsuccessful POST");
                    } else {
                        failCallback("Unsuccessful POST");
                    }
                }
                else {
                    logger.log("info", "No response from the server");
                    failCallback("No response from the server");
                }
                if (error) {
                    logger.log("info", "Error in Post", error);
                    failCallback("info", "Error in Post" + error);
                }
            }
            catch
                (e) {
                console.log(e);
                logger.log("info", "** SOURCE ** Got an exception while fetching response for POST", e)
            }
        }
    );
};

AlarmHandler.prototype.send = function () {
    if (fs.existsSync('microphone/smoke_alarm_recording.wav')) {
        console.log('microphone/smoke_alarm_recording.wav successfully recorded');
    } else {
        console.log('[Error] microphone/smoke_alarm_recording.wav is not found!');
        throw new Error();
    }
    this.form.append('my_file', fs.createReadStream('microphone/smoke_alarm_recording.wav'));
    this.form.submit(this.soundURL, function (err, res) {
        if (res) {
            res.resume();
        }
        if (err) {
            console.log("Error sending wav file: ", err);
        }
    });
};


var alarmHandlerInstance = alarmHandlerInstance || new AlarmHandler();
module.exports.AlarmHandler = alarmHandlerInstance;