import { RAGConfig } from '../types/rag';
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
    rag: RAGConfig;
    openai: {
        apiKey: string | undefined;
        organization?: string;
    };
    pinecone: {
        apiKey: string | undefined;
        indexName: string;
    };
    firebase: {
        projectId?: string;
        serviceAccount?: string;
    };
    instagram: {
        accessToken?: string;
        userId?: string;
        appId?: string;
        appSecret?: string;
        webhookVerifyToken?: string;
        apiVersion: string;
        pageAccessToken?: string;
        facebookPageId?: string;
    };
}
declare const config: Config;
export default config;
//# sourceMappingURL=index.d.ts.map