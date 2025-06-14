export interface Config {
    port: number;
    binance: {
        apiKey: string | undefined;
        apiSecret: string | undefined;
        useTestnet: boolean;
        baseUrl: string;
        wsUrl: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map