// Top level
// Usage: node leeo_service.js [simulator]

var CONFIGFILE = 'sensors.cfg';

console.log('Starting directory: ' + process.cwd());
try {
  process.chdir('/usr/lib/leeonl/customer_image/leeo_services/');
  console.log('Leeo Services directory: ' + process.cwd());
}
catch (err) {
  console.log('chdir: ' + err);
}

logger = require("./logger.js").logger;

g_simulatorMode = false;

var LeeoService = function (){
    this._messageRouter = require('./message_router.js').MessageRouter;
    this._asyncController = require('./async_controller.js').AsyncController;
    this._lightController = require('./light/light_control.js').LightControl;
    this._deviceFsm = require('./device_fsm.js').DeviceFsm;
};

LeeoService.prototype.run = function(){
    var self = this;
    
    process.argv.forEach(function (val, index, array) {
        if (val === 'simulator') {
            g_simulatorMode = true;
            console.log("info", "Using simulator mode");
        }
    });
    
    self._asyncController.getSensorConfig(CONFIGFILE);
    self._deviceFsm.handle("start");
};


// =========== Graceful process exit ==============
process.stdin.resume();

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('cleaning up...');
        leeoService._deviceFsm.transition("off");
        //leeoService._messageRouter.unlink();
        process.exit();
    }
    if (options.exit) {
        process.exit();
    }
}


/*FIXME: Make these useful.
 */
//do something when app is closing
//process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
//process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

//catches uncaught exceptions
//process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// ===============================================


var leeoService = leeoService || new LeeoService();
module.exports.leeoService = leeoService;
leeoService.run();
