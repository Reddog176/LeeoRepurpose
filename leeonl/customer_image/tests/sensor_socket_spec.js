var messageRouter = require("../leeo_services/message_router").MessageRouter;

describe("Socket communication tests", function(){
    it("Set up the domain socket", function(){
        messageRouter.createSensorSocket();
        var net = require('net');
        var client = net.connect({path: '/var/run/leeo/sensors.sock'},
                function() { //'connect' listener
            console.log('client connected');
            client.write('world!\r\n');
            var start = new Date().getTime();
            while(new Date().getTime() < start + 500) {
                ;
            }
            client.write('world2!\r\n');
            client.write('world3!\r\n');
        });
        client.on('data', function(data) {
            console.log(data.toString());
            client.end();
        });
        client.on('end', function() {
            console.log('client disconnected');
        });

    });

});