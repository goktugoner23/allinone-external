interface Logger {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    http: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}
declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map