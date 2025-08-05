"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
class Logger {
    getTimestamp() {
        return new Date().toISOString();
    }
    formatMessage(level, message, ...args) {
        const timestamp = this.getTimestamp();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : '';
        return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
    }
    error(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }
    warn(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }
    info(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.INFO) {
            console.info(this.formatMessage('INFO', message, ...args));
        }
    }
    debug(message, ...args) {
        if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map