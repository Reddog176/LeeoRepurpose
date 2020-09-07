# LeeoRepurpose

Connecting to Leeo hardware:

You can follow the teardown guide at: https://www.allaboutcircuits.com/news/teardown-tuesday-leeo-wifi-smart-alert-carbon-monoxide-smoke-alarm/

Ultimately you want to find the cable that goes between the power supply and the main board. 

You'll need either a USB OTG cable, or a sacrificial USB A extension cable. I went with the sacrifical USB A extension. 

The 5 pin connector is a USB OTG port, and it will also power the Leeo hardware. You can use a USB -> serial adapter on this port to reach a serial console. 
I ended up just using small bits of wire to slip into the end of the cable leading up to the main board, and soldered my usb cable to that. 
Basically, the male end of the usb cable should only have +5 and gnd connected. The female end should have +5, GND, D+ and D- connected. 
You plug the male end into either a USB charger, or a PC usb port. Plug your usb to serial into the female end, then connect the serial cable to your pc. 
Open a console program to the serial port at 115200/8/N/1 and you get a login prompt after the leeo boots. 

You can login to a non-privledged account with U:debian, P:debian. 

