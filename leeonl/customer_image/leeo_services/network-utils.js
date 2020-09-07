//Author Kyle Taylor
//Utils for writing the wifi config stuff and restarting the services

var fs = require('fs');
var exec = require( 'child_process' ).exec

var configFile = "/mnt/data/interfaces"; //"/etc/network/interfaces"
var wpaConfigFile = "/mnt/data/wpa_supplicant.conf";

var hexPattern = new RegExp(/^[0-9A-F]*$/i);

exports.writeConfigFile =function writeConfigFile(ssid,password,security)
{
    //Write interfaces file
    /*    
    auto wlan0
    iface wlan0 inet dhcp
    wpa-conf /mnt/data/wpa_supplicant.conf
    */

    var output = "auto wlan0\niface wlan0 inet dhcp\nwpa-conf /mnt/data/wpa_supplicant.conf";
    fs.writeFileSync(configFile, output, null); 
    
    var wpaOutput = "ctrl_interface=/var/run/wpa_supplicant\nupdate_config=1\n";
    if(security)  {
        //Write both WPA and WEP and wpa_supplicant with figure it out!
       
        //wpa_supplicant damen will fail with a WPA password less than 8 characters
        if(password.length >= 8) {
            wpaOutput += "network={\n";
            wpaOutput += "\tssid=\""+ssid+"\"\n"
            wpaOutput += "\tpsk=\""+password+"\"\n";
            wpaOutput += "}\n\n";
        }
        //console.log("Setting key: \""+password+"\" "+password.length);
        if(password.length == 5 || password.length == 13 || password.length == 16)
        {
            
            //We are dealing with an ascii WEP key
            wpaOutput += "network={\n"
            wpaOutput += "\tssid=\""+ssid+"\"\n";
            wpaOutput += "\tkey_mgmt=NONE\n"
            wpaOutput += "\twep_key0=\""+password+"\"\n"
            wpaOutput += "}\n";
        } else if(password.length == 10 || password.length == 26 || password.length == 32)
        {
        
            //console.log("Setting up WEP key \""+password+"\": "+hexPattern.test(password))
            //We are dealing with a hex WEP key
            
            if(hexPattern.test(password)) {
                //Just one last check to make sure it's a valid hex string
                password = password.toUpperCase();
	            wpaOutput += "network={\n"
                wpaOutput += "\tssid=\""+ssid+"\"\n";
                wpaOutput += "\tkey_mgmt=NONE\n"
                wpaOutput += "\twep_key0="+password+"\n"
                wpaOutput += "}\n";
	            
            }
            
        }
    
    } else {
        wpaOutput += "network={\n"
        wpaOutput += "\tssid=\""+ssid+"\"\n";
        wpaOutput += "\tkey_mgmt=NONE\n"
        wpaOutput += "}\n";
    }
    
    fs.writeFileSync(wpaConfigFile, wpaOutput, null); 

}

exports.resetNetworkServices = function resetNetworkServices()
{
    exec( 'service networking restart', null );
}

//Check if the wifi is connected
//Callback will have one parameter: status which is true if connect and false if not connected
//See here for more details: https://wiki.archlinux.org/index.php/Wireless_network_configuration#Getting_some_useful_information
exports.checkWifiConnectedStatus= function checkWifiConnectedStatus(statusCallback)
{

    
    //This command will return Not connected if it's not connected
    exec( '/usr/sbin/iw dev wlan0 link | /bin/grep "Not connected." | /usr/bin/wc -l', function( error, stdout, stderr ){ 
        console.log("stdout: \""+stdout+"\"");
        if(stdout == "1\n") {
            statusCallback(true); //Not connected
        } else {
            statusCallback(false); //connected
        }
    } );
}

exports.checkWifiConnectedStatusViaDHCP= function checkWifiConnectedStatusViaDHCP(statusCallback)
{

    //This command will return Not connected if it's not connected
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
        
        statusCallback(connected);
    } );
}

//Scan for access points
//callback signature is callback(apList)
//apList is an array with the SSIDs
//The objects have properties that can be accessed. Those properties can be seen in
//the iwlistParse function under fields i.e. apList[i].ssid or  apList[i].encryption_key
exports.scanForAPs= function scanForAPs(callback)
{
    console.log("Starting AP scan");
    //This command will return Not connected if it's not connected
    exec( '/sbin/iwlist wlan0 scanning', function( error, stdout, stderr ){ 
        console.log("Starting AP scan finished");
        var cells = iwlistParse(stdout);
        var aps = {};
        //Remove duplicates
        for (var i in cells) {
            if(cells[i].ssid != undefined && cells[i].ssid.length > 0 ) {
                //console.log(cells[i].ssid+","+cells[i].encryption_key+","+cells[i].signal_level);
                if(cells[i].ssid != undefined) {
                    if(aps[cells[i].ssid] == undefined) {
                        aps[cells[i].ssid] = cells[i];
                    } else if(parseInt(aps[cells[i].ssid].signal_level) < parseInt(cells[i].signal_level)) {
                        aps[cells[i].ssid] = cells[i];
                    }
                }
            }

        }

        var apList = [];
        for (var key in aps){
            apList.push( aps[key] );
        }

        //console.log(apList);
        callback(apList);

    } );
}

//https://gist.github.com/mauricesvay/4408150
function iwlistParse(str) {
    var out = str.replace(/^\s+/mg, '');
    out = out.split('\n');
    var cells = [];
    var line;
    var info = {};
    var fields = {
            'mac' : /^Cell \d+ - Address: (.*)/,
            'ssid' : /^ESSID:"(.*)"/,
            'protocol' : /^Protocol:(.*)/,
            'mode' : /^Mode:(.*)/,
            'frequency' : /^Frequency:(.*)/,
            'encryption_key' : /Encryption key:(.*)/,
            'bitrates' : /Bit Rates:(.*)/,
            'quality' : /Quality(?:=|\:)([^\s]+)/,
            'signal_level' : /Signal level(?:=|\:)([^\s]+)/
    };
    
    info['WPA'] = false;

    for (var i=0,l=out.length; i<l; i++) {
        line = out[i].trim();

        if (!line.length) {
            continue;
        }
        if (line.match("Scan completed :$")) {
            continue;
        }
        if (line.match("Interface doesn't support scanning.$")) {
            continue;
        }

        if (line.match(fields.mac)) {
            cells.push(info);
            info = {};
        }

        for (var field in fields) {
            if (line.match(fields[field])) {
                info[field] = (fields[field].exec(line)[1]).trim();
            } 
            
            if (line.indexOf('IE: IEEE 802.11i/WPA2 Version 1') === 0) {
                info['WPA'] = true;
            } else if (line.indexOf('IE: WPA Version 1') === 0) {
                info['WPA'] = true;
            }
        }
    }
    cells.push(info);
    return cells;
}


/*
exports.checkWifiConnectedStatusViaDHCP(function callback(status) {
		if(status) {
			console.log("Wifi is connected");
		} else {
			console.log("Wifi is NOT connected");
		}
	});
	*/
//exports.writeConfigFile("The LAN Before Time","NotTheLion",true);
//exports.writeConfigFile("TP-LINK_4C06F6","kyletaylor",true);
//exports.resetNetworkServices();
//resetNetworkServices();
/*
exports.scanForAPs(function (aps) 
{
	console.log(aps);
});
*/
/*
//Test code
writeConfigFile("Yo","Password","WPA");

checkWifiConnectedStatus(function callback(status) {
		if(status) {
			console.log("Wifi is connected");
		} else {
			console.log("Wifi is NOT connected");
		}
	});
 */