const winston = require('winston');
const fs = require('fs-extra');
const path = require('node:path');

// Ensure logs directory exists
const logDir = 'logs';
fs.ensureDirSync(logDir);

// Define colors for different log levels
const customColors = {
    error: 'red',
    warn: 'yellow',
    info: 'cyan',
    http: 'magenta',
    verbose: 'blue',
    debug: 'green',
    silly: 'rainbow',
};

// Add colors to Winston
winston.addColors(customColors);

// Custom log format with metadata
const logFormat = winston.format.printf(
    ({ level, message, timestamp, stack }) => {
        return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
    },
);

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // Ensure error stack traces are logged
        winston.format.json(),
        logFormat,
    ),
    transports: [
        // Console log with color and simple format
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }), // Apply color to full log
                winston.format.printf(
                    ({ level, message, timestamp, stack }) => {
                        return `\x1b[1m[${timestamp}]\x1b[0m ${level}: ${
                            stack || message
                        }`;
                    },
                ),
            ),
        }),

        // Separate file for error logs
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),

        // Combined log file for all levels (info, warn, error, etc.)
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
            ),
        }),
    ],
});

// Handle uncaught exceptions & rejections
logger.exceptions.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
    }),
);

logger.rejections.handle(
    new winston.transports.File({
        filename: path.join(logDir, 'rejections.log'),
    }),
);

module.exports = logger;
