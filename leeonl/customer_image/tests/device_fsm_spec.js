/**
 * Finite State Machine test spec
 */

var deviceFsm = require("../leeo_services/device_fsm.js").DeviceFsm;

describe("FSM Tests", function(){
    it("Initialize and start the fSM", function(){
        deviceFsm.handle("start");
        expect(deviceFsm.state).toBe("preInternet");
    });
    it("Test state changes", function(){
        deviceFsm.transition("configurationMode");
        expect(deviceFsm.state).toBe("configurationMode");
        deviceFsm.transition("notastate");
        expect(deviceFsm.state).toBe("configurationMode");
        deviceFsm.transition("preInternet");

    });     
});