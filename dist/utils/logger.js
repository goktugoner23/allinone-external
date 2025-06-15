"use strict";
// Simple console logger implementation
// TODO: Replace with Winston when dependencies are properly installed
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    error: (message, meta) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    },
    info: (message, meta) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    },
    http: (message, meta) => {
        console.log(`[HTTP] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message, meta) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map