//var exec = require('child_process').exec;
var i2c = require('i2c');


function clone(obj){
    if(obj == null || typeof(obj) != 'object')
        return obj;

    var temp = obj.constructor(); // changed

    for(var key in obj)
        temp[key] = clone(obj[key]);
    return temp;
}

function LightControl() {
    this.redAddress = 0x03;
    this.greenAddress = 0x04;
    this.blueAddress = 0x05;
    this.whiteAddress = 0x02;
    
    /* currentColor tracks possible transient states in order to smoothly
     * handle the case of a user changing colors before a transition has
     * completed. userColor is the color the user has actually selected.
     * 
     * In steady-state (not transitioning), userColor==currentColor
     */
    this.currentColor = {
        red: 255,
        green: 255,
        blue: 255,
        intensity: 0.05
    };
    
    this.userColor = {
        red: 255,
        green: 255,
        blue: 255,
        intensity: 1
    };
    
    this.offHex = {
        red: [0x00, 0x00],
        green: [0x00, 0x00],
        blue: [0x00, 0x00],
        white: [0x00, 0x00]
    };
    this.flashColors = [];
    this.colorCycleIndex;
    this.i2cLights = new i2c(0x4c, {device: '/dev/i2c-1'});
    
    this.transientObject = null;
};

LightControl.prototype.setRGB = function(rgb) {
    var self=this;
    self.userColor.red   = rgb.red   || 0;
    self.userColor.green = rgb.green || 0;
    self.userColor.blue  = rgb.blue  || 0;
    if(rgb.intensity){
        self.userColor.intensity  = rgb.intensity;
    }
},

LightControl.prototype.setCurrentColor = function(rgb) {
    var self=this;
    self.currentColor.red   = rgb.red   || 0;
    self.currentColor.green = rgb.green || 0;
    self.currentColor.blue  = rgb.blue  || 0;
    if(rgb.intensity){
        self.currentColor.intensity  = rgb.intensity;
    }
},


// FIXME: Not needed?
LightControl.prototype.saturation = function(rgb) {
    var low  = Math.min(rgb.red, Math.min(rgb.green, rgb.blue));
    var high = Math.max(rgb.red, Math.max(rgb.green, rgb.blue));
    return Math.round(100 * ((high - low) / high));
};

//FIXME: Not needed?
LightControl.prototype.calculateWhite = function(rgb) {
    var self=this;
    var white = (255 - self.saturation(rgb)) / 255.0 * (rgb.red + rgb.green + rgb.blue) / 3;
    return white;
};

LightControl.prototype.scaleRgbValuesToDevice = function(rgb) {
    var self=this;
    var MAX = 65535;
    var scaledValues = {};
    scaledValues.red   = Math.round((rgb.red  / 255.0) * MAX * rgb.intensity);
    scaledValues.green = Math.round((rgb.green / 255.0) * MAX * rgb.intensity);
    scaledValues.blue  = Math.round((rgb.blue  / 255.0) * MAX * rgb.intensity);
    scaledValues.white = Math.round((rgb.white / 255.0) * MAX * rgb.intensity);
    return scaledValues;
};

LightControl.prototype.byteArray= function(str){
    var a = [];
    while(str.length <4){
        str="0"+str;
    }
    for (var i = 0; i < str.length; i += 2) {
        a.unshift("0x" + str.substr(i, 2));
    }
    return a;
};

LightControl.prototype.convertValuesToHex = function(scaledValues) {
    var self=this;
    var hexValues = {};
    hexValues.red   = self.byteArray(scaledValues.red.toString(16));
    hexValues.green = self.byteArray(scaledValues.green.toString(16));
    hexValues.blue  = self.byteArray(scaledValues.blue.toString(16));
    hexValues.white = self.byteArray(scaledValues.white.toString(16));
    return hexValues;
};


LightControl.prototype.runCommands = function(hexValues) {
    var self=this;
    self.i2cLights.writeBytes(0x02,hexValues.white, function(err) {});
    self.i2cLights.writeBytes(0x03,hexValues.red, function(err) {});
    self.i2cLights.writeBytes(0x04,hexValues.green, function(err) {});
    self.i2cLights.writeBytes(0x05,hexValues.blue, function(err) {});
};

LightControl.prototype.off = function() {
    var self=this;
    self.runCommands(self.offHex);
    self.state = "off";
    
};
LightControl.prototype.on = function(rgb){
    var self=this;

    //FIXME: White makes 
    if(rgb.red === rgb.green && rgb.green === rgb.blue){
        rgb.white=255;
        rgb.red = 0;
        rgb.green = 0;
        rgb.blue = 0;
    }
    else{
        rgb.white=0;
    }
    
    var scaledValues = self.scaleRgbValuesToDevice(rgb);
    var hexValues = self.convertValuesToHex(scaledValues);
    self.runCommands(hexValues);
};

LightControl.prototype.changeLightColorTo = function(color,callback){
    var self = this;
    var colorArray = [];
    colorArray.push(color);
    self.setRGB(color);
    self.transition(colorArray,callback);
};

LightControl.prototype.transition = function(newColors, callback, context){
    var self = this;

    if(self.transientObject==null){
        var newColor = newColors.shift();
        if(!newColor.intensity){
            newColor.intensity = self.userColor.intensity;
        }
        logger.log("info", "transitioning from: " + self.currentColor.intensity + " newColor: " + newColor.intensity);
        self.transientObject = clone(self.currentColor);
        self.transientObject.iteration = 0;
        self.transientObject.intervalObject = 
            setInterval(self.doTransition,20,newColor,self.currentColor,self.transientObject, self, newColors, callback, context);
    }
    else{
        logger.log("info", "cleaning up unfinished transition");
        clearInterval(self.transientObject.intervalObject);
        self.setCurrentColor(self.transientObject);
        self.transientObject = null;
        self.transition(newColors, callback,context);
    }
};


//FIXME: Transition speed should be configurable
LightControl.prototype.doTransition = function(newColor,previousColor,transientObject, context, newColors, callback, callbackContext){
    var redDiff = (newColor.red - previousColor.red) / 25;
    var greenDiff = (newColor.green - previousColor.green) / 25;
    var blueDiff = (newColor.blue - previousColor.blue) / 25;
    var whiteDiff = (newColor.white - previousColor.white) / 25;
    var intensityDiff = (newColor.intensity - previousColor.intensity) / 25;
    
    transientObject.red += redDiff;
    transientObject.green += greenDiff;
    transientObject.blue += blueDiff;
    transientObject.white += whiteDiff;
    transientObject.intensity += intensityDiff;
    context.on(transientObject);
    if(++transientObject.iteration == 25){
        clearInterval(transientObject.intervalObject);
        context.setCurrentColor(newColor);
        context.on(context.currentColor);
        delete transientObject;
        if(newColors.length>1){
            context.transition(newColors,callback,callbackContext);
        }
        else if(typeof(callback) =="function"){
            callback(callbackContext);
        }
    }
};


LightControl.prototype.rainbow = function(callback,context){
    var self = this;
    var flashColors = [];
    flashColors.push({red:255,green:0,blue:0,intensity:1});
    flashColors.push({red:255,green:127,blue:0,intensity:1});
    flashColors.push({red:255,green:255,blue:0,intensity:1});
    flashColors.push({red:0,green:255,blue:0,intensity:1});
    flashColors.push({red:0,green:0,blue:255,intensity:1});
    flashColors.push({red:75,green:0,blue:255,intensity:1});
    flashColors.push({red:143,green:0,blue:255,intensity:1});
    flashColors.push({red:255,green:255,blue:255,intensity:1});
    flashColors.push(self.userColor);
    lightControl.transition(flashColors, callback, context);
    
};

LightControl.prototype.pulse = function(color, context){
    if(color.intensity + color.pulseSpeed > 1.0 ||
            color.intensity+color.pulseSpeed < 0.05){
        color.pulseSpeed = color.pulseSpeed * -1;
    }
    color.intensity = color.intensity + color.pulseSpeed;
    context.on(color);  
};

LightControl.prototype.danger = function() {
    var self=this;
    self.i2cLights.writeBytes(0x02,[0x00, 0x00], function(err) {});
    self.i2cLights.writeBytes(0x03,[0xFF, 0xFF], function(err) {});
    self.i2cLights.writeBytes(0x04,[0x00, 0x00], function(err) {});
    self.i2cLights.writeBytes(0x05,[0x00, 0x00], function(err) {});
};


LightControl.prototype.adjustIntensity = function(value){
    var self = this;
    self.userColor.intensity=value;
    self.on(self.userColor);    
};

LightControl.prototype.flashColor = function(rgb,callback,context){
    var self = this;
    var flashColors = [];
    flashColors.push(rgb);
    flashColors.push(self.userColor);
    self.colorCycleIndex=1;
    self.transition(flashColors, callback, context);
    
};

var lightControl = lightControl || new LightControl();
lightControl.on(lightControl.currentColor);
module.exports.LightControl = lightControl;
