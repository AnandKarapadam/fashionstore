const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize } = format;


const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] : ${stack || message}`;
});


const logger = createLogger({
  level: "info", 
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }), 
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat), 
    }),
    new transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new transports.File({
      filename: "logs/combined.log",
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: "logs/rejections.log" }),
  ]
});

module.exports = logger;