var fs = require('fs');
var exec = require('child_process').exec;
var message_router = require('./message_router.js');
var light_control = require('./light/light_control.js');
var i2c = require('i2c');
var device_fsm = require('./device_fsm.js');
var async = require('async');

var ofnWire = new i2c("0x33", {device: '/dev/i2c-1'});
var alsWire = new i2c("0x39", {device: '/dev/i2c-1'});
var vocWire = new i2c("0x4c", {device: '/dev/i2c-1'});
var tempHumWire = new i2c("0x40", {device: '/dev/i2c-1'});
var tiWire = new i2c("0x41", {device: '/dev/i2c-1'});
var pirWire = new i2c("0x35", {device: '/dev/i2c-1'});
var wirelock = false;

function DecValue(lsb, msb)
{
    var dec_var = 0;    
    var neg_bit = 0;

    var lsb_value = parseInt(lsb);
    var msb_value = parseInt(msb);

    msb_value &= 0x3F;

    dec_var = ((msb_value<<8)+lsb_value);
    neg_bit = (dec_var&0x2000)>>13;


    if (neg_bit==1)
    {
        dec_var = ((~dec_var)&0x3FFF)+1;
        dec_var = -dec_var;
    }
    else
    {
        dec_var &= 0x1FFF;      
    }

    return dec_var;
}


function AsyncController(){
    this.sensorArray = {};
    this.sensorReadFunctions = {};
    //this.simulatorMode = false;
    console.log("async initialized");
};


AsyncController.prototype.getOfnReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        async.series([
            function(callback){
                ofnWire.readBytes(0x03, 1, function(err, res) {
                    callback(null,res[0]);
                });
            },
            function(callback){
                ofnWire.readBytes(0x04, 1, function(err, res) {
                    callback(null,res[0]);
                });
            }],
            function(err,res){
                // The sensor expects this read but we don't care about the result
                result = res[0];
                logger.log("info","OFN sensor reading: " + result);
                if(result!==0){
                    device_fsm.DeviceFsm.handle("ofnAdjust",result);
                }
                wirelock = false;
                scope.collectSensorReading(sensorName,result);
            }
        );
    }
    else{
        
    }
};

AsyncController.prototype.getAlsReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        var cpl = 0.83333333;
        async.series([
            function(callback){
                alsWire.writeBytes(0x80, [0x0b], function(err){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                });
            },
            function(callback){
                alsWire.writeBytes(0x8f, [0x00], function(err){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                });
            },
            function(callback){
                alsWire.writeBytes(0x81, [0xed], function(err){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                });
            },
            function(callback){
                alsWire.writeBytes(0x8d, [0x02], function(err){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null);
                    }
                });
            },
            
            function(callback){
                alsWire.readBytes(0xb4, 1, function(err, res){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null,res[0]);
                    }
                });
            },
            
            function(callback){
                alsWire.readBytes(0xb5, 1, function(err, res){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null,res[0]);
                    }
                });
            },
            
            function(callback){
                alsWire.readBytes(0xb6, 1, function(err, res){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null,res[0]);
                    }
                });
            },
            
            function(callback){
                alsWire.readBytes(0xb7, 1, function(err, res){
                    if(err){
                        callback(err);
                    }
                    else{
                        callback(null,res[0]);
                    }
                });
            }
            
        ],
        function(err,results){
            if(err){
                console.log("err: " +err);
            }
            var r14, r15, r16, r17;
            r14 = results[4];
            r15 = results[5];
            r16 = results[6];
            r17 = results[7];
            var c0 = (r15 << 8) | r14;
            var c1 = (r17 << 8) | r16;
            var lux1 = (c0 - 1.87 * c1) / cpl;
            var lux2 = (0.63 * c0 - c1) /cpl;
            var max = Math.max(lux1,lux2,0);
            logger.log("info","ALS reading: ",max);
            device_fsm.DeviceFsm.handle("processAmbientLight", max);
            wirelock = false;
            scope.collectSensorReading(sensorName,max);
        });
    }
};

AsyncController.prototype.getVocReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        async.series([
            function(callback){
                vocWire.readBytes(0x09, 2, function(err, res) {
                    var result = res.readUInt16LE(0);
                    callback(null,result);
                });
            },
            function(callback){
                vocWire.readBytes(0x0a, 2, function(err, res) {
                    var result = res.readUInt16LE(0);
                    callback(null,result);
                });
            },
            function(callback){
                vocWire.readBytes(0x0b, 2, function(err, res) {
                    var result = res.readUInt16LE(0);
                    callback(null,result);
                });
            },
            function(callback){
                vocWire.readBytes(0x0c, 2, function(err, res) {
                    var result = res.readUInt16LE(0);
                    callback(null,result);
                });
            },
            function(callback){
                vocWire.readBytes(0x0d, 2, function(err, res) {
                    var result = res.readUInt16LE(0);
                    callback(null,result);
                });
            },
        ],
        function(err,res){
            var result = res[0];
            logger.log("info", "voc reading: " + result);
            device_fsm.DeviceFsm.handle("checkVOC",result);
            wirelock = false;
            scope.collectSensorReading(sensorName,result);
        });
    }
};

AsyncController.prototype.getTempReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        async.series([
            function(callback){
                tempHumWire.readBytes(0xe3, 2, function(err, res) {
                    var read = res.readUInt16BE(0);
                    result = -46.85 + 175.72 / 65536.00 * parseFloat(read);
                    callback(null,result);
                });
            }
        ],
        function(err,res){
            logger.log("info","Temp sensor reading: " + res[0]);
            wirelock = false;
            scope.collectSensorReading(sensorName,res[0]);
        });
    }
};

AsyncController.prototype.getHumReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        async.series([
            function(callback){
                tempHumWire.readBytes(0xe5, 2, function(err, res) {
                    var read = res.readUInt16BE(0);
                    result = -6.0 + 125.0 / 65536.0 * parseFloat(read,10);
                    callback(null,result);
                });
            }
        ],
        function(err,res){
            logger.log("info","Humidity sensor reading: " + res[0]);
            wirelock = false;
            scope.collectSensorReading(sensorName,res[0]);
        });
    }
};


AsyncController.prototype.initTiReading = function(sensorName,scope){
    var self = this;
    exec( '/usr/lib/leeonl/customer_image/leeo_services/HDC1000/writeTiSensor', function( error, stdout, stderr ){ 
        
    });
    logger.log("info","init ti sensor");
    setTimeout(scope.getTiReading, 30, sensorName, scope);
};

AsyncController.prototype.getTiReading = function(sensorName, scope){
    exec( '/usr/lib/leeonl/customer_image/leeo_services/HDC1000/readTiSensor', function( error, stdout, stderr ){ 
        var lines = stdout.split('\n');
        var temp = parseFloat(lines[0]);
        var hum = parseFloat(lines[1]);
        scope.collectSensorReading("TempHum",temp);
        logger.log("info", "temp reading: " + temp);
        scope.collectSensorReading("TempHum",hum);
        logger.log("info", "hum reading: " + hum);
        
    });
};

AsyncController.prototype.getPirReading = function(sensorName, scope){
    if (wirelock === false){
        wirelock = true;
        async.series([
            function(callback){
                pirWire.readBytes(0x04, 13, function(err, rxBuffer) {
                    if(err){
                        console.log("read error:"+err);
                    }
                    callback(null,rxBuffer);
                });
                
            }
        ],
        function(err,res){
            var reading = res[0];
            res1=DecValue(reading[1],reading[2]);
            res2=DecValue(reading[3],reading[4]);
            res3=DecValue(reading[5],reading[6]);
            res4=DecValue(reading[7],reading[8]);
            res5=DecValue(reading[9],reading[10]);
            logger.log("info","PIR sensor reading: " + res1 + " " + res2 + " " + res3 + " " + res4 + " " + res5 );
            wirelock = false;
            scope.collectSensorReading(sensorName,res1);
        });
    }
};

AsyncController.prototype.registerReadHandlers = function() {
    var self = this;
    self.sensorReadFunctions["ofn"] = self.getOfnReading;
    self.sensorReadFunctions["als"] = self.getAlsReading;
    self.sensorReadFunctions["voc"] = self.getVocReading;
    self.sensorReadFunctions["temperature"] = self.getTempReading;
    self.sensorReadFunctions["humidity"] = self.getHumReading;
    self.sensorReadFunctions["temphum"] = self.initTiReading;
    self.sensorReadFunctions["pir"] = self.getPirReading;
};

AsyncController.prototype.readSensor = function(sensorName){
    var self = this;
    var lowerCaseName = sensorName.toLowerCase();
    if(lowerCaseName in self.sensorReadFunctions){
        self.sensorReadFunctions[lowerCaseName](sensorName, self);
    }
    else{
        logger.log("error", "No read handler for this sensor: " + sensorName);
        return "error";
    }
};


// Read in configuration file and store each sensor's configuration data
// in sensorArray
AsyncController.prototype.getSensorConfig = function (configFile) {
    var self = this;

    fs.readFileSync(configFile, 'utf8').split(/[\r\n]+/).forEach(function (line) {
        var json;
        if (json = self.isSensorStringFormatValid(line)) {
            var sensor = {};
            sensor['serial_number'] = json['serial_number'];
            sensor['sensor_name'] = json['sensor_name'];
            sensor['filename'] = json['filename'];
            sensor['poll_interval'] = json['poll_interval'];
            sensor['publish'] = json['publish'];
            self.sensorArray[json['sensor_name']] = sensor;
        }
        else {
            // ignore
        }
    });
};

// Check the format of the sensors.cfg strings and make sure that each line has
// the expected syntax (JSON, key properties)
AsyncController.prototype.isSensorStringFormatValid = function (line) {
    // Check if valid JSON
    try {
        var jsonObject = JSON.parse(line);
    } catch (e) {
        return false;
    }

    // Check if has valid keys
    if (jsonObject.hasOwnProperty('sensor_name') &&
        jsonObject.hasOwnProperty('poll_interval')&&
        jsonObject.hasOwnProperty('publish')
        ) {
        return jsonObject;
    }
    else {
        return false;
    }
};

// Gets the sensor reading for the specified sensor name in the sensorArray
AsyncController.prototype.getSensorReading = function (sensorName, context, callback) {
    var self = context;

    if (g_simulatorMode) {
        // logger.log("info", "SIMULATOR MODE");
        var simulatedValue = AsyncController.prototype.getSimulatedValue(sensorName);
        self.collectSensorReading(sensorName, simulatedValue);
    } else {
        self.readSensor(sensorName);
    }
};

AsyncController.prototype.collectSensorReading = function(sensorName, sensorValue){
    var self = this;
    var sensor = self.sensorArray[sensorName];
    if(sensorValue !== "error"){
        if(sensor['publish']===true){
            message_router.MessageRouter.sendSensorReading(sensorValue, sensor);
        }
    }
};



AsyncController.prototype.getSimulatedValue = function (type) {
    var randomValue = Math.floor(Math.random() * 180) + 60;
    return randomValue;
};


AsyncController.prototype.loop = function () {
    // Process the array which contains the parsed configuration and get
    // the current sensor data reading for each one. It will call for the next
    // sensor reading based on the configured interval
    var self = this;
    
    self.registerReadHandlers();
    for(var key in self.sensorArray){
        if(key !== "OFN"){
            self.sensorArray[key]["interval_id"] = setInterval(
                    self.getSensorReading,
                    (self.sensorArray[key]["poll_interval"]),
                    self.sensorArray[key]["sensor_name"],
                    self);
        }
    }

};



var asyncController = asyncController || new AsyncController();
asyncController.registerReadHandlers();
module.exports.AsyncController = asyncController;
