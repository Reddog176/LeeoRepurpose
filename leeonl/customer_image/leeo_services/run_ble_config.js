var bleConfig = require('./bluetooth-wifi-config');

bleConfig.startWifiConfig(function () {
    console.log("Error! Failed to start ble config");
});

//bleConfig.stopWifiConfig();
