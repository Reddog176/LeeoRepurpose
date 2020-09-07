var lightControl = require("../leeo_services/light/light_control.js").LightControl;

describe("Lighting Tests", function(){
    it("Try changing the lights", function(){
        lightControl.changeLightColorTo({ red: '176', green: '255', blue: '133' });
    });
    it("Try setting the lights on and off", function(){
        var start = new Date().getTime();
        while(new Date().getTime() < start + 5000) {
            ;
        }
        console.log("turning off");
        lightControl.off();
        var start = new Date().getTime();
        while(new Date().getTime() < start + 5000) {
            ;
        }
        console.log("turning on");
        lightControl.on();
        var start = new Date().getTime();
        while(new Date().getTime() < start + 5000) {
            ;
        }
        lightControl.off();
    });
 
});