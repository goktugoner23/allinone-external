export interface Config {
    port: number;
    nodeEnv: string;
    binance: {
        apiKey: string | undefined;
        apiSecret: string | undefined;
        useTestnet: boolean;
        spot: {
            baseUrl: string;
            wsUrl: string;
        };
        futures: {
            baseUrl: string;
            wsUrl: string;
        };
        coinm: {
            baseUrl: string;
            wsUrl: string;
        };
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    logging: {
        level: string;
        enableFileLogging: boolean;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map