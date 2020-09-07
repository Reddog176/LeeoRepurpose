console.log('Starting directory: ' + process.cwd());
try {
  process.chdir('/usr/lib/leeonl/customer_image/leeo_services/');
  console.log('Leeo Services directory: ' + process.cwd());
}
catch (err) {
  console.log('chdir: ' + err);
}

var forever = require('forever-monitor');
var fs = require('fs');


var child = new (forever.Monitor)('./leeo_service.js', {
    silent: true,
    outFile: "/var/log/leeo/forever.out",
    'killTree': true,
    'pidFile': "/var/run/leeo/leeo-child.pid",
    options: []
});

child.on('exit', function () {
    console.log('leeo_service.js has exited');
});


child.on('start', function(process, data) { 
        fs.writeFile("/var/run/leeo/leeo-monitor.pid", data.pid); 
});
child.start();