/**
 * New node file
 */

var winston = require("winston");

var logger = logger || new (winston.Logger)({
    transports: 
    [
      //new (winston.transports.Console)(),
      new(winston.transports.File)({
          filename: "LeeoService.log",
          dirname: "/var/log/leeo",
          level: "warn"
      })
    ]
});

module.exports.logger = logger;