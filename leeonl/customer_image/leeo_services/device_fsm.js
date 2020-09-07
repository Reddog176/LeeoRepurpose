var underscore = require('underscore');
var machina = require('machina')(underscore);
var lightControl = require("./light/light_control.js").LightControl;
var asyncController = require('./async_controller.js').AsyncController;
var message_router = require('./message_router.js');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;


var MAX_RETRIES = 10;
var retry_count = 0;
var bluetooth_process = null;
var updateProcess = null;

function testConnection(context,callback){
    
    exec( '/sbin/ifconfig wlan0', function( error, stdout, stderr ){ 
        connected = false;
        
        var lines = stdout.split(/\r\n|\r|\n/);
        
        for(var i = 0;i < lines.length;i++){
            line = lines[i];
            if (line.indexOf('inet addr') !== -1) {
                    networkAddress = line.match(/inet addr:([a-fA-F0-9:.]*)/)[1] || null;
                    if (networkAddress) {
                        connected = true;
                    }
                }
            
        }
        
        if(!connected){
            console.log("not connected...");
            if(typeof(callback) === "function"){
                callback(false);
            }
        }
        else{
            if(context.state === "configurationMode"){
                clearInterval(context.bleConfigInterval);
                message_router.MessageRouter.putDeviceConfig();
                clearTimeout(context.wifiTimeout);
                context.handle("stopPulse");
                lightControl.flashColor({red:51,green:153,blue:255,intensity:1}, context.transitionToState0,context);
            }
            if(typeof(callback) === "function"){
                callback(true);
            }
        }
        
        
    } );
    
};

function spawnBleMonitor(context){
    /* This spawn is necessary to handle an error case. If the bluetooth
     * process gets interrupted it is not recoverable unless the process
     * itself is restarted. This has something to do with 'require' cacheing
     * in Node.
     */

    bluetooth_process = spawn('/usr/local/bin/node', ['/usr/lib/leeonl/customer_image/leeo_services/bluetooth-wifi-config.js']);
    bluetooth_process.stdout.on('data', function (data) {
        var dataString = data.toString('utf-8');
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
        
        else if(dataString.indexOf("disconnect") > -1){
            context.handle("stopPulse");
        }

        else if(data=="NotifyOnlyCharacteristic subscribe\n"){
            console.log("transitioning" + context);
            context.handle("startPulse");
        }
        else if(dataString.indexOf("NetworkConfigCompleted") > -1) {
            context.bleConfigInterval = setInterval(testConnection, 1000, context,null);
            //throw error here
            context.wifiTimeout = setTimeout(clearInterval,30000,context.bleConfigInterval);
        }
        else if(dataString.indexOf("ConfigComplete") > -1){
            bluetooth_process.kill('SIGHUP');
            //exec( '/bin/sh /usr/bin/software_update.sh', null );
             var fs = require('fs'),
                 out = fs.openSync('/dev/null', 'a'),
                 err = fs.openSync('/dev/null', 'a');
            updateProcess = spawn('/bin/sh', ['/usr/bin/software_update.sh'],{
                detached: true,
                stdio: [ 'ignore', out, err ]
            });
            updateProcess.unref();
        }
        console.log('stdout: ' + dataString+"\t"+(typeof data));
    });

    bluetooth_process.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    bluetooth_process.on('close', function (code) {
        //TODO: Should restart the process if the user hasn't killed it
        if(context.state==="configurationMode"){
            context.transition("pre-internet");
        }
        console.log('child process exited with code ' + code);
    });
};



function onInternetConnection(){
    console.log("haveInternet");
    message_router.MessageRouter.subscribeToPubnub();
    //self._messageRouter.createSensorSocket();
    asyncController.loop();
    
};



var DeviceFsm = machina.Fsm.extend({
    initialize: function() {
        var self = this;
        logger.log("info","initializing");
        //FIXME: should this data be persistent?
        self.DARK_THRESHOLD = 3;
        self.VOC_WARNING_THRESHOLD = 700;
        self.OFN_TIMEOUT = 3000; // ms
        self.ALSMode = false;
        self.warningOffenders = [];
        self.dangerOffenders = [];
        self.ledIntensity=1.0;
        self.lastOfnTimestamp = 0;
        self.lastOfnReading = 0;
        self.bleConfigInterval;
        self.wifiTimeout;
    },
    
    transitionToPreInternet: function(){
        var self = this;
        self.transition("preInternet");
    },
    transitionToState0: function(context){
        var self = context;
        self.transition("state0");
    },
    
    togglePir: function(state){
        var self = this;
        if(self.state==="off"){
            self.transition("state0");
        }
        self.PIRMode = state;
    },
    
    toggleAls: function(state){
        var self = this;
        if(self.state==="off"){
            self.transition("state0");
        }
        self.ALSMode = state;
    },

    doOfnAdjust: function(value){
        var self=this;
        var currentTime = Date.now();
        var delta = currentTime - self.lastOfnTimestamp;
        var normalReading = value;
        if(normalReading>127){
            normalReading = value-255;
        }
        // clockwise: 0-127(fastest)
        // counterclockwise: -127(fastest) - 0
        if(delta < self.OFN_TIMEOUT){
            var averageSpeed = (normalReading + self.lastOfnReading) /2;
            var positionChange = averageSpeed * (delta / 1000);
            var percentageChange = positionChange/40;// / 10;
            var newIntensity = self.ledIntensity + percentageChange;
            if(newIntensity>=0 && newIntensity<=1){
                self.ledIntensity = newIntensity;
            }
            else if (newIntensity<0){
                self.ledIntensity=0;
            }
            else{
                self.ledIntensity=1;
            }
            logger.log("info","OFN setting intensity: "+self.ledIntensity);
            lightControl.adjustIntensity(self.ledIntensity);
            
        }
        
        self.lastOfnTimestamp = currentTime;
        self.lastOfnReading = normalReading;
    },
    
    
    states: {
        uninitialized: {
            start: function() {
                var self = this;
                self.ofn = asyncController.sensorArray["OFN"];
                self.transition("preInternet");
            }
        },
        preInternet: {
            _onEnter : function () {
                var self = this;
                logger.log("info","Now in preInternet state");

                testConnection(self,function(res){
                    if(res == false){
                        var initColor = {
                            red: 255,
                            green: 255,
                            blue: 255,
                            intensity: 1.0
                        };
                        lightControl.changeLightColorTo(initColor);
                        spawnBleMonitor(self);
                        self.transition("configurationMode");
                    }
                    else{
                        logger.log("info", "Network configured");
                        console.log("network configured");
                        self.transition("state0");
                        onInternetConnection();
                    }
                });
            },
            
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        configurationMode: {
            _onEnter : function () {
                var self = this;
                self.ofn["interval_id"] = setInterval(
                    asyncController.getSensorReading,
                    self.ofn["poll_interval"],
                    self.ofn["sensor_name"],
                    asyncController);
            },
            ofnAdjust : function(value){
                this.doOfnAdjust(value);
            },
            startPulse : function(){
                var self = this;
                clearInterval(self.ofn["interval_id"]);
                logger.log("info","Now in configurationMode state");
                var configColor = {
                        red: 255,
                        green: 255,
                        blue: 255,
                        intensity: 1,
                        pulseSpeed: 0.02
                };
                if(!self.configIntervalObject){
                    self.configIntervalObject = 
                        setInterval(lightControl.pulse,20, configColor, lightControl);
                }
                
            },
            stopPulse : function(){
                var self = this;
                self.ofn["interval_id"] = setInterval(
                    asyncController.getSensorReading,
                    self.ofn["poll_interval"],
                    self.ofn["sensor_name"],
                    asyncController);
                if(self.configIntervalObject){
                    clearInterval(self.configIntervalObject);
                    delete self.configIntervalObject;
                }
            },
            _onExit : function () {
                var self = this;
                self.handle("stopPulse");
                clearInterval(self.ofn["interval_id"]);
                onInternetConnection();
                

            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        rainbow: {
            _onEnter : function () {
                var self = this;
                lightControl.rainbow(self.transitionToState0,self);
                console.log("Now in rainbow state: "+self.state );

            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        state0: {
            _onEnter : function () {
                var self = this;
                console.log("Now in state0 state");
                if(self.priorState !== "configuration"){
                    lightControl.changeLightColorTo(lightControl.userColor, null);
                }
                
                self.ofn["interval_id"] = setInterval(
                        asyncController.getSensorReading,
                        self.ofn["poll_interval"],
                        self.ofn["sensor_name"],
                        asyncController);
            },
            _onExit : function () {
                var self = this;
                clearInterval(self.ofn["interval_id"]);  
            },
            processAmbientLight : function(level){
                var self = this;
                if(self.ALSMode === true && Number(level) > self.DARK_THRESHOLD){
                    self.transition("off");
                }
            },
            changeLightColorTo : function(rgb){
                lightControl.changeLightColorTo(rgb);
            },
            checkVOC : function (value){
                var self = this;
                if (value > self.VOC_WARNING_THRESHOLD){
                    self.warningOffenders.push("voc");
                    self.transition("warning");
                }
            },
            issueWarning : function(value){
                var self = this;
                var offender = value;
                logger.log("info","warning issued: "+ offender);
                self.warningOffenders.push(offender);
                self.transition("warning");
            },
            issueDanger : function(value){
                var self = this;
                var offender = value;
                logger.log("info","Danger issued: "+ offender);
                self.dangerOffenders.push(offender);
                self.transition("danger");
            },
            ofnAdjust : function(value){
                this.doOfnAdjust(value);
            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        off: {
            _onEnter : function () {
                var self = this;
                console.log("Now in off state");
                lightControl.off();
            },
            processAmbientLight : function(level){
                var self = this;
                if(self.ALSMode === true && Number(level) <= self.DARK_THRESHOLD){
                    self.transition("state0");
                }
            },
            changeLightColorTo : function(rgb){
                var self = this;
                lightControl.setRGB(rgb);
            },
            checkVOC : function (value){
                var self = this;
                if (value > self.VOC_WARNING_THRESHOLD){
                    self.warningOffenders.push("voc");
                    self.transition("warning");
                }
            },
            issueWarning : function(value){
                var self = this;
                var offender = value;
                logger.log("info","warning issued: "+ offender);
                self.warningOffenders.push(offender);
                self.transition("warning");
            },
            issueDanger : function(value){
                var self = this;
                var offender = value;
                logger.log("info","Danger issued: "+ offender);
                self.dangerOffenders.push(offender);
                self.transition("danger");
            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        partyMode: {
            _onEnter : function () {
                var self = this;
                logger.log("info","Now in partyMode state");
            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        warning: {
            _onEnter : function () {
                var self = this;
                logger.log("info","Now in warning state");
                //lightControl.warning();
                var warningColor = {
                        red: 255,
                        green: 255,
                        green: 255,
                        blue: 0,
                        intensity: 1,
                        pulseSpeed: 0.02
                };
                self.warningIntervalObject = 
                    setInterval(lightControl.pulse,20, warningColor, lightControl);
            },
            _onExit : function () {
                var self = this;
                clearInterval(self.warningIntervalObject);
            },
            changeLightColorTo : function(rgb){
                var self = this;
                lightControl.setRGB(rgb);
            },
            issueDanger : function(value){
                var self = this;
                var offender = value;
                logger.log("info","Danger issued: "+ offender);
                self.dangerOffenders.push(offender);
                self.transition("danger");
            },
            clearWarning : function(value){
                var self = this;
                var offender = value;
                for ( var i=0; i<self.warningOffenders.length; ++i){
                    if(self.warningOffenders[i]===offender){
                        self.warningOffenders.splice(i);
                    }
                }
                if (self.warningOffenders.length == 0){
                    if(self.priorState == "danger"){
                        self.transition("state0");
                    } else{
                        self.transition(self.priorState);
                    }
                }
            },
            checkVOC : function (value){
                var self = this;

                if (value <= self.VOC_WARNING_THRESHOLD){
                    for ( var i=0; i<self.warningOffenders.length; ++i){
                        if(self.warningOffenders[i]==="voc"){
                            self.warningOffenders.splice(i);
                        }
                    }
                    if (self.warningOffenders.length == 0){
                        if(self.priorState == "danger"){
                            self.transition("state0");
                        } else{
                            self.transition(self.priorState);
                        }
                    }
                }
            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            }
        },
        danger: {
            _onEnter : function () {
                var self = this;
                logger.log("info","Now in danger state");
                var warningColor = {
                    red: 255,
                    green: 0,
                    blue: 0,
                    intensity: 1,
                    pulseSpeed: 0.02
                };
                self.dangerIntervalObject =
                    setInterval(lightControl.pulse,20, warningColor, lightControl);
            },
            _onExit : function () {
                var self = this;
                clearInterval(self.dangerIntervalObject);
            },
            "*" : function( payload ){
                DeviceFsm.prototype.catchallHandler(payload);
            },
            changeLightColorTo : function(rgb){
                var self = this;
                lightControl.setRGB(rgb);
            },
            issueWarning : function(value){
                var self = this;
                var offender = value;
                logger.log("info","warning issued: "+ offender);
                self.warningOffenders.push(offender);
            },
            clearWarning : function(value){
                var self = this;
                var offender = value;
                for ( var i=0; i<self.warningOffenders.length; ++i){
                    if(self.warningOffenders[i]===offender){
                        self.warningOffenders.splice(i);
                    }
                }
            },
            clearDanger : function(value){
                var self = this;
                var offender = value;
                for ( var i=0; i<self.dangerOffenders.length; ++i){
                    if(self.dangerOffenders[i]===offender){
                        self.dangerOffenders.splice(i);
                    }
                }
                if (self.dangerOffenders.length == 0){
                    logger.log("info", "warning offenders list: " + self.warningOffenders);
                    if(self.warningOffenders.length != 0){
                        self.transition("warning");
                    } else{
                        self.transition("state0");
                    }
                }
            },
        },
    }
});

DeviceFsm.prototype.catchallHandler = function( payload ){
    logger.log("info","Action not supported in the current state: " + payload);
};

var deviceFsmInstance = deviceFsmInstance || new DeviceFsm();
module.exports.DeviceFsm = deviceFsmInstance;
